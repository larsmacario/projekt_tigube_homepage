import type JSZip from 'jszip'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CUSTOMER_DOCUMENTS_BUCKET,
  normalizeCustomerDocumentStoragePath,
} from '@/lib/customer-documents'
import { buildCustomerReportPdf } from '@/lib/customer-report-pdf'
import type { Customer, Document, Pet } from '@/lib/types'

export const BULK_EXPORT_MAX_CUSTOMERS = 50

type CustomerWithRelations = Customer & {
  pets: Pet[] | null
  documents: Document[] | null
}

export type AddCustomerToZipResult = {
  folderName: string
  documentErrors: string[]
}

export function sanitizeZipSegment(value: string): string {
  const sanitized = value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)

  return sanitized || 'Unbekannt'
}

export function buildCustomerFolderName(
  customer: Pick<Customer, 'nachname' | 'vorname' | 'kundennummer'>,
  usedFolderNames: Set<string>
): string {
  const baseName = sanitizeZipSegment(
    [customer.nachname, customer.vorname].filter(Boolean).join('_') || 'Kunde'
  )
  let folderName = baseName

  if (usedFolderNames.has(folderName)) {
    const suffix = customer.kundennummer
      ? sanitizeZipSegment(customer.kundennummer)
      : `${usedFolderNames.size + 1}`
    folderName = `${baseName}_${suffix}`
  }

  let uniqueName = folderName
  let counter = 2
  while (usedFolderNames.has(uniqueName)) {
    uniqueName = `${folderName}_${counter}`
    counter += 1
  }

  usedFolderNames.add(uniqueName)
  return uniqueName
}

function uniqueDocumentFileName(fileName: string, usedNames: Set<string>): string {
  const sanitized = fileName.replace(/[/\\]/g, '_').trim() || 'dokument'
  if (!usedNames.has(sanitized)) {
    usedNames.add(sanitized)
    return sanitized
  }

  const dotIndex = sanitized.lastIndexOf('.')
  const stem = dotIndex > 0 ? sanitized.slice(0, dotIndex) : sanitized
  const ext = dotIndex > 0 ? sanitized.slice(dotIndex) : ''

  let counter = 2
  let candidate = `${stem}_${counter}${ext}`
  while (usedNames.has(candidate)) {
    counter += 1
    candidate = `${stem}_${counter}${ext}`
  }

  usedNames.add(candidate)
  return candidate
}

async function loadCustomerWithRelations(
  client: SupabaseClient,
  customerId: string
): Promise<CustomerWithRelations | null> {
  const { data, error } = await client
    .from('contacts')
    .select('*, pets(*), documents(*)')
    .eq('id', customerId)
    .eq('contact_type', 'customer')
    .maybeSingle()

  if (error) throw error
  return data as CustomerWithRelations | null
}

export async function addCustomerToZip(
  zip: JSZip,
  client: SupabaseClient,
  customerId: string,
  usedFolderNames: Set<string>
): Promise<AddCustomerToZipResult> {
  const customer = await loadCustomerWithRelations(client, customerId)
  if (!customer) {
    throw new Error(`Kunde nicht gefunden: ${customerId}`)
  }

  const folderName = buildCustomerFolderName(customer, usedFolderNames)
  const customerFolder = zip.folder(folderName)
  if (!customerFolder) {
    throw new Error(`ZIP-Ordner konnte nicht erstellt werden: ${folderName}`)
  }

  const pets = customer.pets ?? []
  const documents = customer.documents ?? []
  const documentErrors: string[] = []

  const pdfBlob = await buildCustomerReportPdf({ customer, pets })
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
  customerFolder.file('Uebersicht.pdf', pdfBuffer)

  if (documents.length > 0) {
    const documentsFolder = customerFolder.folder('Dokumente')
    if (!documentsFolder) {
      throw new Error(`Dokumente-Ordner konnte nicht erstellt werden: ${folderName}`)
    }

    const usedDocumentNames = new Set<string>()

    for (const document of documents) {
      const storagePath = normalizeCustomerDocumentStoragePath(document.file_path)
      const { data, error } = await client.storage
        .from(CUSTOMER_DOCUMENTS_BUCKET)
        .download(storagePath)

      if (error || !data) {
        documentErrors.push(
          `${document.file_name}: ${error?.message || 'Download fehlgeschlagen'}`
        )
        console.error('Bulk export document download failed:', document.id, error)
        continue
      }

      const fileName = uniqueDocumentFileName(document.file_name, usedDocumentNames)
      const fileBuffer = Buffer.from(await data.arrayBuffer())
      documentsFolder.file(fileName, fileBuffer)
    }
  }

  return { folderName, documentErrors }
}

export function buildSingleCustomerZipFilename(
  customer: Pick<Customer, 'nachname' | 'vorname'>
): string {
  const name = sanitizeZipSegment(
    [customer.nachname, customer.vorname].filter(Boolean).join('_') || 'Kunde'
  )
  return `${name}_Bericht.zip`
}

export function buildBulkCustomersZipFilename(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10)
  return `Tierhalter-Berichte_${stamp}.zip`
}

export async function generateZipBuffer(zip: JSZip): Promise<Buffer> {
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
