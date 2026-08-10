import {
  CUSTOMER_DOCUMENTS_BUCKET,
  buildCustomerDocumentStoragePath,
} from '@/lib/customer-documents'
import {
  DEFAULT_IMPFASS_PAGE_CATEGORY,
  MAX_IMPFASS_PHOTOS,
  normalizeImpfpassPageCategory,
  type ImpfpassPageCategory,
} from '@/lib/impfpass-photo-categories'

export const IMPFPASS_UPLOAD_SESSION_TTL_MS = 2 * 60 * 60 * 1000 // 2 Stunden

export type ImpfpassUploadSessionStatus = 'active' | 'closed' | 'expired'

export type ImpfpassUploadSessionItem = {
  id: string
  session_id: string
  document_id: string | null
  file_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  page_category: ImpfpassPageCategory | null
  description: string | null
  created_at: string
  signedUrl?: string
}

export type ImpfpassUploadSession = {
  id: string
  customer_id: string
  pet_id: string | null
  status: ImpfpassUploadSessionStatus
  expires_at: string
  created_at: string
  updated_at: string
  items?: ImpfpassUploadSessionItem[]
}

export function buildImpfpassSessionStoragePath(
  customerId: string,
  sessionId: string,
  fileExt: string
): string {
  return `${customerId}/impfpass-sessions/${sessionId}/${Date.now()}.${fileExt}`
}

export function getImpfpassUploadMobileUrl(origin: string, sessionId: string): string {
  return `${origin}/impfpass-upload/${sessionId}`
}

export function getImpfpassUploadQrCodeUrl(mobileUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileUrl)}`
}

export function isImpfpassUploadSessionExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now()
}

export function normalizeImpfpassUploadDescription(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 500) : null
}

export async function countImpfpassPhotosForPet(
  supabase: { from: (table: string) => any },
  petId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('pet_id', petId)
    .eq('document_type', 'impfpass')

  if (error) throw error
  return count ?? 0
}

export async function createImpfpassDocumentFromSessionItem(input: {
  supabase: { from: (table: string) => any; storage: { from: (bucket: string) => any } }
  customerId: string
  petId: string
  item: Pick<
    ImpfpassUploadSessionItem,
    'file_path' | 'file_name' | 'file_size' | 'mime_type' | 'page_category' | 'description'
  >
}): Promise<{ id: string }> {
  const { supabase, customerId, petId, item } = input
  const fileExt = item.file_name.split('.').pop()?.toLowerCase() || 'jpg'
  const targetPath = buildCustomerDocumentStoragePath(customerId, 'impfpass', fileExt, petId)

  if (item.file_path !== targetPath) {
    const { error: copyError } = await supabase.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .copy(item.file_path, targetPath)

    if (copyError) {
      const { error: moveError } = await supabase.storage
        .from(CUSTOMER_DOCUMENTS_BUCKET)
        .move(item.file_path, targetPath)
      if (moveError) throw moveError
    } else {
      await supabase.storage.from(CUSTOMER_DOCUMENTS_BUCKET).remove([item.file_path])
    }
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      customer_id: customerId,
      pet_id: petId,
      document_type: 'impfpass',
      page_category: normalizeImpfpassPageCategory(item.page_category ?? DEFAULT_IMPFASS_PAGE_CATEGORY),
      description: item.description,
      file_path: targetPath,
      file_name: item.file_name,
      file_size: item.file_size,
      mime_type: item.mime_type,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

export async function assertImpfpassUploadCapacity(
  supabase: { from: (table: string) => any },
  petId: string | null,
  sessionId: string,
  additionalCount = 1
): Promise<void> {
  if (!petId) {
    const { count, error } = await supabase
      .from('impfpass_upload_session_items')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    if (error) throw error
    if ((count ?? 0) + additionalCount > MAX_IMPFASS_PHOTOS) {
      throw new Error(`Maximal ${MAX_IMPFASS_PHOTOS} Impfpass-Fotos pro Tier erlaubt.`)
    }
    return
  }

  const existing = await countImpfpassPhotosForPet(supabase, petId)
  if (existing + additionalCount > MAX_IMPFASS_PHOTOS) {
    throw new Error(`Maximal ${MAX_IMPFASS_PHOTOS} Impfpass-Fotos pro Tier erlaubt.`)
  }
}
