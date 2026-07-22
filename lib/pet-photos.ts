import type { SupabaseClient } from '@supabase/supabase-js'

export const PET_PHOTOS_BUCKET = 'pet-photos'
export const MAX_PET_PHOTOS = 5
/** Entspricht dem Supabase-Bucket-Limit (pet-photos, 10 MB) */
export const MAX_PET_PHOTO_BYTES = 10 * 1024 * 1024
export const PET_PHOTO_SIGNED_URL_TTL = 3600

export const PET_PHOTOS_SELECT = 'pet_photos(file_path, sort_order, created_at)'

export const ALLOWED_PET_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

type PetPhotoRow = {
  count?: number
  file_path?: string
  sort_order?: number
  created_at?: string
}

function resolvePetPhotoMimeType(file: File): string | null {
  if (file.type && ALLOWED_PET_PHOTO_MIME_TYPES.has(file.type)) {
    return file.type
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension) return null

  return EXTENSION_TO_MIME[extension] ?? null
}

export function validatePetPhotoFile(file: File): string | null {
  const mimeType = resolvePetPhotoMimeType(file)
  if (!mimeType) {
    return 'Nur JPEG-, PNG- oder WebP-Bilder sind erlaubt.'
  }
  if (file.size > MAX_PET_PHOTO_BYTES) {
    return 'Das Bild darf maximal 10 MB groß sein.'
  }
  return null
}

export function getPetPhotoUploadMimeType(file: File): string {
  return resolvePetPhotoMimeType(file) ?? 'image/jpeg'
}

export function buildPetPhotoStoragePath(
  customerId: string,
  petId: string,
  fileExt: string
): string {
  return `${customerId}/${petId}/${Date.now()}.${fileExt}`
}

export function getPhotoCountFromPetRow(pet: {
  pet_photos?: PetPhotoRow[] | null
}): number {
  const rows = pet.pet_photos
  if (!rows || rows.length === 0) return 0
  if (typeof rows[0]?.count === 'number') {
    return rows[0].count
  }
  return rows.filter((row) => row.file_path).length
}

export function getPrimaryPhotoPathFromRows(
  rows: PetPhotoRow[] | null | undefined
): string | null {
  if (!rows || rows.length === 0) return null

  const withPath = rows.filter(
    (row): row is PetPhotoRow & { file_path: string } =>
      typeof row.file_path === 'string' && row.file_path.length > 0
  )
  if (withPath.length === 0) return null

  const sorted = [...withPath].sort((a, b) => {
    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
    if (orderDiff !== 0) return orderDiff
    return (a.created_at ?? '').localeCompare(b.created_at ?? '')
  })

  return sorted[0].file_path
}

export function normalizePetWithPhotoCount<T extends Record<string, unknown>>(
  pet: T & { pet_photos?: PetPhotoRow[] | null }
): Omit<T, 'pet_photos'> & { photo_count: number } {
  const photo_count = getPhotoCountFromPetRow(pet)
  const { pet_photos: _ignored, ...rest } = pet
  return { ...rest, photo_count }
}

export function normalizePetWithPhotos<T extends Record<string, unknown>>(
  pet: T & { pet_photos?: PetPhotoRow[] | null }
): Omit<T, 'pet_photos'> & { photo_count: number; primary_photo_path: string | null } {
  const photo_count = getPhotoCountFromPetRow(pet)
  const primary_photo_path = getPrimaryPhotoPathFromRows(pet.pet_photos)
  const { pet_photos: _ignored, ...rest } = pet
  return { ...rest, photo_count, primary_photo_path }
}

export async function attachPrimaryPhotoUrls<
  T extends { primary_photo_path?: string | null },
>(
  supabase: SupabaseClient,
  pets: T[]
): Promise<(Omit<T, 'primary_photo_path'> & { primary_photo_url: string | null })[]> {
  const uniquePaths = [
    ...new Set(
      pets
        .map((pet) => pet.primary_photo_path)
        .filter((path): path is string => typeof path === 'string' && path.length > 0)
    ),
  ]

  const urlByPath = new Map<string, string>()
  await Promise.all(
    uniquePaths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(PET_PHOTOS_BUCKET)
        .createSignedUrl(path, PET_PHOTO_SIGNED_URL_TTL)

      if (!error && data?.signedUrl) {
        urlByPath.set(path, data.signedUrl)
      }
    })
  )

  return pets.map((pet) => {
    const { primary_photo_path, ...rest } = pet
    const primary_photo_url = primary_photo_path
      ? urlByPath.get(primary_photo_path) ?? null
      : null
    return { ...rest, primary_photo_url }
  })
}

export async function normalizePetsWithPhotos<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  pets: Array<T & { pet_photos?: PetPhotoRow[] | null }>
): Promise<
  (Omit<T, 'pet_photos'> & { photo_count: number; primary_photo_url: string | null })[]
> {
  const normalized = pets.map((pet) => normalizePetWithPhotos(pet))
  return attachPrimaryPhotoUrls(supabase, normalized)
}

export function getPetsWithoutPhotos<T extends { photo_count?: number }>(pets: T[]): T[] {
  return pets.filter((pet) => (pet.photo_count ?? 0) === 0)
}
