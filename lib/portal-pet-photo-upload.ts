import { supabase } from '@/lib/supabase'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import {
  buildPetPhotoStoragePath,
  getPetPhotoUploadMimeType,
  PET_PHOTOS_BUCKET,
  validatePetPhotoFile,
} from '@/lib/pet-photos'
import { readApiResponse } from '@/lib/read-api-response'
import type { PetPhoto } from '@/lib/types'

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

/** Lädt direkt in Supabase Storage – ohne Vercel als Zwischenstation. */
export async function uploadPetPhotoDirect(petId: string, file: File): Promise<PetPhoto> {
  const validationError = validatePetPhotoFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const customerId = await getPortalCustomerId()
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = buildPetPhotoStoragePath(customerId, petId, fileExt)
  const mimeType = getPetPhotoUploadMimeType(file)

  const { error: uploadError } = await supabase.storage
    .from(PET_PHOTOS_BUCKET)
    .upload(filePath, file, { contentType: mimeType, upsert: false })

  if (uploadError) {
    throw new Error(uploadError.message || 'Upload in Supabase Storage fehlgeschlagen')
  }

  try {
    const response = await authenticatedFetch(`/api/portal/pets/${petId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: mimeType,
      }),
    })

    const { data, error } = await readApiResponse<{ photo?: PetPhoto; error?: string }>(response)
    if (error) {
      throw new Error(error)
    }
    if (!data?.photo) {
      throw new Error('Foto konnte nicht registriert werden')
    }

    return data.photo
  } catch (error) {
    await supabase.storage.from(PET_PHOTOS_BUCKET).remove([filePath])
    throw error
  }
}
