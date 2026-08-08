import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { CustomerDocumentType } from '@/lib/customer-documents'
import { readApiResponse } from '@/lib/read-api-response'
import type { Document } from '@/lib/types'

export async function uploadPortalDocument(input: {
  file: File
  documentType: CustomerDocumentType
  petId?: string
}): Promise<{ error: string | null }> {
  try {
    const formData = new FormData()
    formData.append('file', input.file)
    formData.append('document_type', input.documentType)
    if (input.petId) {
      formData.append('pet_id', input.petId)
    }

    const response = await authenticatedFetch('/api/portal/documents', {
      method: 'POST',
      body: formData,
    })

    const { error } = await readApiResponse<{ document?: Document; error?: string }>(response)
    return { error }
  } catch (error) {
    console.error('Error uploading document:', error)
    return {
      error: error instanceof Error ? error.message : 'Upload fehlgeschlagen',
    }
  }
}
