export const PET_PHOTOS_BUCKET = 'pet-photos'
export const MAX_PET_PHOTOS = 5
export const MAX_PET_PHOTO_BYTES = 10 * 1024 * 1024
export const PET_PHOTO_SIGNED_URL_TTL = 3600

export const ALLOWED_PET_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

export function validatePetPhotoFile(file: File): string | null {
  if (!ALLOWED_PET_PHOTO_MIME_TYPES.has(file.type)) {
    return 'Nur JPEG-, PNG- oder WebP-Bilder sind erlaubt.'
  }
  if (file.size > MAX_PET_PHOTO_BYTES) {
    return 'Das Bild darf maximal 10 MB groß sein.'
  }
  return null
}

export function buildPetPhotoStoragePath(
  customerId: string,
  petId: string,
  fileExt: string
): string {
  return `${customerId}/${petId}/${Date.now()}.${fileExt}`
}

export function getPhotoCountFromPetRow(pet: {
  pet_photos?: Array<{ count: number }> | null
}): number {
  return pet.pet_photos?.[0]?.count ?? 0
}

export function normalizePetWithPhotoCount<T extends Record<string, unknown>>(
  pet: T & { pet_photos?: Array<{ count: number }> | null }
): Omit<T, 'pet_photos'> & { photo_count: number } {
  const photo_count = getPhotoCountFromPetRow(pet)
  const { pet_photos: _ignored, ...rest } = pet
  return { ...rest, photo_count }
}

export function getPetsWithoutPhotos<T extends { photo_count?: number }>(pets: T[]): T[] {
  return pets.filter((pet) => (pet.photo_count ?? 0) === 0)
}
