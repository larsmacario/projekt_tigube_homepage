import { supabase } from '@/lib/supabase'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import {
  buildCustomerDocumentStoragePath,
  CUSTOMER_DOCUMENTS_BUCKET,
  getCustomerDocumentFileExtension,
  getCustomerDocumentUploadMimeType,
  type CustomerDocumentType,
  validateCustomerDocumentFile,
} from '@/lib/customer-documents'
import type { ImpfpassPageCategory } from '@/lib/impfpass-photo-categories'
import { readApiResponse } from '@/lib/read-api-response'
import type { Document } from '@/lib/types'

async function getPortalCustomerId(): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Nicht angemeldet')
  }

  const { data, error } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', user.id)
    .eq('contact_type', 'customer')
    .maybeSingle()

  if (error || !data) {
    throw new Error('Kundenprofil nicht gefunden')
  }

  return data.id
}

export type PortalDocumentDirectUploadInput = {
  file: File
  documentType: CustomerDocumentType
  petId?: string
  pageCategory?: ImpfpassPageCategory
  description?: string
}

/** Lädt direkt in Supabase Storage – ohne Vercel als Zwischenstation. */
export async function uploadPortalDocumentDirect(
  input: PortalDocumentDirectUploadInput
): Promise<Document> {
  const validationError = validateCustomerDocumentFile(input.file)
  if (validationError) {
    throw new Error(validationError)
  }

  const customerId = await getPortalCustomerId()
  const fileExt = getCustomerDocumentFileExtension(input.file.name)
  const filePath = buildCustomerDocumentStoragePath(
    customerId,
    input.documentType,
    fileExt,
    input.petId
  )
  const mimeType = getCustomerDocumentUploadMimeType(input.file)

  const { error: uploadError } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .upload(filePath, input.file, { contentType: mimeType, upsert: false })

  if (uploadError) {
    throw new Error(uploadError.message || 'Upload in Supabase Storage fehlgeschlagen')
  }

  try {
    const response = await authenticatedFetch('/api/portal/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: filePath,
        file_name: input.file.name,
        file_size: input.file.size,
        mime_type: mimeType,
        document_type: input.documentType,
        pet_id: input.petId ?? null,
        page_category: input.pageCategory ?? null,
        description: input.description?.trim() || null,
      }),
    })

    const { data, error } = await readApiResponse<{ document?: Document; error?: string }>(
      response
    )
    if (error) {
      throw new Error(error)
    }
    if (!data?.document) {
      throw new Error('Dokument konnte nicht registriert werden')
    }

    return data.document
  } catch (error) {
    await supabase.storage.from(CUSTOMER_DOCUMENTS_BUCKET).remove([filePath])
    throw error
  }
}
