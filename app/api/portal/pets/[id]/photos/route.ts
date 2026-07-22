import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import {
  ALLOWED_PET_PHOTO_MIME_TYPES,
  buildPetPhotoStoragePath,
  MAX_PET_PHOTOS,
  MAX_PET_PHOTO_BYTES,
  normalizePetWithPhotoCount,
  PET_PHOTOS_BUCKET,
  PET_PHOTO_SIGNED_URL_TTL,
  validatePetPhotoFile,
  getPetPhotoUploadMimeType,
} from '@/lib/pet-photos'
import { assertPetOwnership, getPortalCustomer } from '@/lib/portal-customer'
import type { PetPhoto } from '@/lib/types'

async function attachSignedUrls(
  supabase: Awaited<ReturnType<typeof getServerClient>>['client'],
  photos: PetPhoto[]
): Promise<PetPhoto[]> {
  return Promise.all(
    photos.map(async (photo) => {
      const { data, error } = await supabase.storage
        .from(PET_PHOTOS_BUCKET)
        .createSignedUrl(photo.file_path, PET_PHOTO_SIGNED_URL_TTL)

      if (error || !data?.signedUrl) {
        return photo
      }

      return { ...photo, signedUrl: data.signedUrl }
    })
  )
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: petId } = await props.params
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const customerResult = await getPortalCustomer(supabase, user.id)
    if ('error' in customerResult && 'status' in customerResult) {
      return NextResponse.json({ error: customerResult.error }, { status: customerResult.status })
    }

    const ownership = await assertPetOwnership(supabase, petId, customerResult.customer.id)
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status })
    }

    const { data, error } = await supabase
      .from('pet_photos')
      .select('*')
      .eq('pet_id', petId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error

    const photos = await attachSignedUrls(supabase, (data || []) as PetPhoto[])
    return NextResponse.json({ photos })
  } catch (error: unknown) {
    console.error('Error fetching pet photos:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Fotos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: petId } = await props.params
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const customerResult = await getPortalCustomer(supabase, user.id)
    if ('error' in customerResult && 'status' in customerResult) {
      return NextResponse.json({ error: customerResult.error }, { status: customerResult.status })
    }

    const ownership = await assertPetOwnership(supabase, petId, customerResult.customer.id)
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status })
    }

    const { count, error: countError } = await supabase
      .from('pet_photos')
      .select('*', { count: 'exact', head: true })
      .eq('pet_id', petId)

    if (countError) throw countError
    if ((count ?? 0) >= MAX_PET_PHOTOS) {
      return NextResponse.json(
        { error: `Maximal ${MAX_PET_PHOTOS} Fotos pro Tier erlaubt.` },
        { status: 400 }
      )
    }

    const contentType = request.headers.get('content-type') || ''
    let filePath: string
    let fileName: string
    let fileSize: number
    let uploadMimeType: string

    if (contentType.includes('application/json')) {
      const body = await request.json()
      filePath = typeof body.file_path === 'string' ? body.file_path : ''
      fileName = typeof body.file_name === 'string' ? body.file_name : ''
      fileSize = typeof body.file_size === 'number' ? body.file_size : 0
      uploadMimeType = typeof body.mime_type === 'string' ? body.mime_type : ''

      const expectedPrefix = `${customerResult.customer.id}/${petId}/`
      if (!filePath.startsWith(expectedPrefix)) {
        return NextResponse.json({ error: 'Ungültiger Dateipfad' }, { status: 400 })
      }
      if (!fileName || !uploadMimeType || fileSize <= 0 || fileSize > MAX_PET_PHOTO_BYTES) {
        return NextResponse.json({ error: 'Ungültige Datei-Metadaten' }, { status: 400 })
      }
      if (!ALLOWED_PET_PHOTO_MIME_TYPES.has(uploadMimeType)) {
        return NextResponse.json({ error: 'Nur JPEG-, PNG- oder WebP-Bilder sind erlaubt.' }, { status: 400 })
      }

      const folderPath = filePath.slice(0, filePath.lastIndexOf('/'))
      const uploadedName = filePath.slice(filePath.lastIndexOf('/') + 1)
      const { data: uploadedFiles, error: listError } = await supabase.storage
        .from(PET_PHOTOS_BUCKET)
        .list(folderPath, { search: uploadedName })

      if (listError) throw listError
      if (!uploadedFiles?.some((entry) => entry.name === uploadedName)) {
        return NextResponse.json({ error: 'Datei in Supabase Storage nicht gefunden' }, { status: 400 })
      }
    } else {
      const formData = await request.formData()
      const file = formData.get('file')

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Datei ist erforderlich' }, { status: 400 })
      }

      const validationError = validatePetPhotoFile(file)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      filePath = buildPetPhotoStoragePath(customerResult.customer.id, petId, fileExt)
      fileName = file.name
      fileSize = file.size
      uploadMimeType = getPetPhotoUploadMimeType(file)

      const { error: uploadError } = await supabase.storage
        .from(PET_PHOTOS_BUCKET)
        .upload(filePath, file, { contentType: uploadMimeType, upsert: false })

      if (uploadError) throw uploadError
    }

    const { data, error: dbError } = await supabase
      .from('pet_photos')
      .insert({
        pet_id: petId,
        customer_id: customerResult.customer.id,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        mime_type: uploadMimeType,
        sort_order: count ?? 0,
      })
      .select()
      .single()

    if (dbError) {
      await supabase.storage.from(PET_PHOTOS_BUCKET).remove([filePath])
      throw dbError
    }

    const [photo] = await attachSignedUrls(supabase, [data as PetPhoto])
    return NextResponse.json({ photo })
  } catch (error: unknown) {
    console.error('Error uploading pet photo:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Hochladen des Fotos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
