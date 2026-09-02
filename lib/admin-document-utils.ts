import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { readApiResponse } from '@/lib/read-api-response'
import type { CustomerDocumentType } from '@/lib/customer-documents'
import type { ImpfpassPageCategory } from '@/lib/impfpass-photo-categories'
import type { Document } from '@/lib/types'

export function isImageDocument(doc: Document): boolean {
  return doc.mime_type?.startsWith('image/') ?? false
}

export function isPdfDocument(doc: Document): boolean {
  return (
    doc.mime_type === 'application/pdf' ||
    doc.file_name.toLowerCase().endsWith('.pdf')
  )
}

export async function fetchAdminDocumentSignedUrl(
  documentId: string
): Promise<{ signedUrl?: string; error: string | null }> {
  try {
    const response = await authenticatedFetch(`/api/admin/documents/${documentId}`, {
      credentials: 'include',
    })
    const { data, error } = await readApiResponse<{ signedUrl?: string; error?: string }>(
      response
    )
    return { signedUrl: data?.signedUrl, error }
  } catch (error) {
    console.error('Error fetching admin document signed URL:', error)
    return {
      error: error instanceof Error ? error.message : 'Vorschau nicht verfügbar',
    }
  }
}

export async function updateAdminDocumentMetadata(input: {
  documentId: string
  documentType?: CustomerDocumentType
  petId?: string | null
  pageCategory?: ImpfpassPageCategory
  description?: string
}): Promise<{ document?: Document; error: string | null }> {
  try {
    const payload: Record<string, string | null> = {}
    if (input.documentType) payload.document_type = input.documentType
    if (input.petId !== undefined) payload.pet_id = input.petId
    if (input.pageCategory) payload.page_category = input.pageCategory
    if (input.description !== undefined) payload.description = input.description

    const response = await authenticatedFetch(`/api/admin/documents/${input.documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    const { data, error } = await readApiResponse<{ document?: Document; error?: string }>(
      response
    )
    return { document: data?.document, error }
  } catch (error) {
    console.error('Error updating admin document metadata:', error)
    return {
      error: error instanceof Error ? error.message : 'Aktualisierung fehlgeschlagen',
    }
  }
}
