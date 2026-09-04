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

export type AdminDocumentDirectUploadInput = {
  file: File
  customerId: string
  documentType: CustomerDocumentType
  petId?: string
  pageCategory?: ImpfpassPageCategory
  description?: string
}

/** Lädt direkt in Supabase Storage – ohne Vercel als Zwischenstation. */
export async function uploadAdminDocumentDirect(
  input: AdminDocumentDirectUploadInput
): Promise<Document> {
  const validationError = validateCustomerDocumentFile(input.file)
  if (validationError) {
    throw new Error(validationError)
  }

  const fileExt = getCustomerDocumentFileExtension(input.file.name)
  const filePath = buildCustomerDocumentStoragePath(
    input.customerId,
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
    const response = await authenticatedFetch('/api/admin/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: input.customerId,
        file_path: filePath,
        file_name: input.file.name,
        file_size: input.file.size,
        mime_type: mimeType,
        document_type: input.documentType,
        pet_id: input.petId ?? null,
        page_category: input.pageCategory ?? null,
        description: input.description?.trim() || null,
      }),
      credentials: 'include',
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

export async function uploadAdminDocuments(input: {
  files: File[]
  customerId: string
  documentType: CustomerDocumentType
  petId?: string
  pageCategory?: ImpfpassPageCategory
  description?: string
}): Promise<{ documents: Document[]; errors: string[] }> {
  const documents: Document[] = []
  const errors: string[] = []

  for (const file of input.files) {
    try {
      const document = await uploadAdminDocumentDirect({
        file,
        customerId: input.customerId,
        documentType: input.documentType,
        petId: input.petId,
        pageCategory: input.pageCategory,
        description: input.description,
      })
      documents.push(document)
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : `${file.name}: Upload fehlgeschlagen`
      )
    }
  }

  return { documents, errors }
}
