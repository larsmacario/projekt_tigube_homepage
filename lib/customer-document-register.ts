import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ALLOWED_CUSTOMER_DOCUMENT_TYPES,
  type CustomerDocumentType,
} from '@/lib/customer-documents'
import {
  DEFAULT_IMPFASS_PAGE_CATEGORY,
  isImpfpassPageCategory,
  MAX_IMPFASS_PHOTOS,
  normalizeImpfpassPageCategory,
  type ImpfpassPageCategory,
} from '@/lib/impfpass-photo-categories'

export type CustomerDocumentRegisterInput = {
  customerId: string
  documentType: CustomerDocumentType
  filePath: string
  fileName: string
  fileSize: number
  mimeType: string
  petId?: string | null
  pageCategory?: ImpfpassPageCategory | string | null
  description?: string | null
}

export type CustomerDocumentRegisterResult =
  | { document: Record<string, unknown> }
  | { error: string; status: number }

function normalizeDescription(
  documentType: CustomerDocumentType,
  descriptionRaw?: string | null
): string | null {
  const defaultDescription =
    documentType === 'vertrag'
      ? 'Betreuungsvertrag'
      : documentType === 'wurmtest'
        ? 'Wurmtest'
        : null

  return descriptionRaw?.trim()
    ? descriptionRaw.trim().slice(0, 500)
    : defaultDescription
}

export async function registerCustomerDocument(
  supabase: SupabaseClient,
  input: CustomerDocumentRegisterInput
): Promise<CustomerDocumentRegisterResult> {
  const {
    customerId,
    documentType,
    filePath,
    fileName,
    fileSize,
    mimeType,
    petId = null,
    pageCategory = null,
    description = null,
  } = input

  if (!ALLOWED_CUSTOMER_DOCUMENT_TYPES.includes(documentType)) {
    return { error: 'Ungültiger Dokumenttyp', status: 400 }
  }

  const requiresPet = documentType === 'impfpass' || documentType === 'wurmtest'
  if (requiresPet && !petId) {
    return { error: 'Dieses Dokument muss einem Tier zugeordnet werden.', status: 400 }
  }

  const descriptionRequired =
    documentType !== 'impfpass' && documentType !== 'vertrag' && documentType !== 'wurmtest'
  if (descriptionRequired && !description?.trim()) {
    return { error: 'Beschreibung ist erforderlich', status: 400 }
  }

  if (pageCategory && !isImpfpassPageCategory(pageCategory)) {
    return { error: 'Ungültige Impfpass-Kategorie', status: 400 }
  }

  if (requiresPet && petId) {
    if (documentType === 'impfpass') {
      const { count, error: countError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('pet_id', petId)
        .eq('document_type', 'impfpass')

      if (countError) throw countError
      if ((count ?? 0) >= MAX_IMPFASS_PHOTOS) {
        return {
          error: `Maximal ${MAX_IMPFASS_PHOTOS} Impfpass-Fotos pro Tier erlaubt.`,
          status: 400,
        }
      }
    }

    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id')
      .eq('id', petId)
      .eq('customer_id', customerId)
      .maybeSingle()

    if (petError) throw petError
    if (!pet) {
      return { error: 'Tier nicht gefunden', status: 404 }
    }
  }

  const resolvedPageCategory =
    documentType === 'impfpass'
      ? normalizeImpfpassPageCategory(pageCategory ?? DEFAULT_IMPFASS_PAGE_CATEGORY)
      : null

  const { data, error: dbError } = await supabase
    .from('documents')
    .insert({
      customer_id: customerId,
      pet_id: petId || null,
      document_type: documentType,
      page_category: resolvedPageCategory,
      description: normalizeDescription(documentType, description),
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
    })
    .select()
    .single()

  if (dbError) throw dbError

  return { document: data }
}
