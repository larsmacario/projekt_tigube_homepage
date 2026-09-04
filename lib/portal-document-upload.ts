import type { CustomerDocumentType } from '@/lib/customer-documents'
import type { ImpfpassPageCategory } from '@/lib/impfpass-photo-categories'
import { uploadPortalDocumentDirect } from '@/lib/portal-document-upload-direct'
import type { Document } from '@/lib/types'

export type PortalDocumentUploadInput = {
  file: File
  documentType: CustomerDocumentType
  petId?: string
  pageCategory?: ImpfpassPageCategory
  description?: string
}

export async function uploadPortalDocument(
  input: PortalDocumentUploadInput
): Promise<{ document?: Document; error: string | null }> {
  try {
    const document = await uploadPortalDocumentDirect(input)
    return { document, error: null }
  } catch (error) {
    console.error('Error uploading document:', error)
    return {
      error: error instanceof Error ? error.message : 'Upload fehlgeschlagen',
    }
  }
}

export async function uploadPortalDocuments(
  input: Omit<PortalDocumentUploadInput, 'file'> & { files: File[] }
): Promise<{ documents: Document[]; errors: string[] }> {
  const documents: Document[] = []
  const errors: string[] = []

  for (const file of input.files) {
    const { document, error } = await uploadPortalDocument({
      file,
      documentType: input.documentType,
      petId: input.petId,
      pageCategory: input.pageCategory,
      description: input.description,
    })
    if (document) {
      documents.push(document)
    } else {
      errors.push(error || `${file.name}: Upload fehlgeschlagen`)
    }
  }

  return { documents, errors }
}

export {
  deletePortalDocument,
  fetchPortalDocumentSignedUrl,
  updatePortalDocumentMetadata,
} from '@/lib/portal-document-upload-helpers'
