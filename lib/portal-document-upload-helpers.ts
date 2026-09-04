import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { CustomerDocumentType } from '@/lib/customer-documents'
import type { ImpfpassPageCategory } from '@/lib/impfpass-photo-categories'
import { readApiResponse } from '@/lib/read-api-response'
import type { Document } from '@/lib/types'

export async function updatePortalDocumentMetadata(input: {
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

    const response = await authenticatedFetch(`/api/portal/documents/${input.documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const { data, error } = await readApiResponse<{ document?: Document; error?: string }>(response)
    return { document: data?.document, error }
  } catch (error) {
    console.error('Error updating document metadata:', error)
    return {
      error: error instanceof Error ? error.message : 'Aktualisierung fehlgeschlagen',
    }
  }
}

export async function deletePortalDocument(
  documentId: string
): Promise<{ error: string | null }> {
  try {
    const response = await authenticatedFetch(`/api/portal/documents/${documentId}`, {
      method: 'DELETE',
    })
    const { error } = await readApiResponse(response)
    return { error }
  } catch (error) {
    console.error('Error deleting document:', error)
    return {
      error: error instanceof Error ? error.message : 'Löschen fehlgeschlagen',
    }
  }
}

export async function fetchPortalDocumentSignedUrl(
  documentId: string
): Promise<{ signedUrl?: string; error: string | null }> {
  try {
    const response = await authenticatedFetch(`/api/portal/documents/${documentId}`)
    const { data, error } = await readApiResponse<{ signedUrl?: string; error?: string }>(response)
    return { signedUrl: data?.signedUrl, error }
  } catch (error) {
    console.error('Error fetching document signed URL:', error)
    return {
      error: error instanceof Error ? error.message : 'Vorschau nicht verfügbar',
    }
  }
}
