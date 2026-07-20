import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import {
  buildPetPhotoStoragePath,
  MAX_PET_PHOTOS,
  normalizePetWithPhotoCount,
  PET_PHOTOS_BUCKET,
  PET_PHOTO_SIGNED_URL_TTL,
  validatePetPhotoFile,
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

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Datei ist erforderlich' }, { status: 400 })
    }

    const validationError = validatePetPhotoFile(file)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
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

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = buildPetPhotoStoragePath(customerResult.customer.id, petId, fileExt)

    const { error: uploadError } = await supabase.storage
      .from(PET_PHOTOS_BUCKET)
      .upload(filePath, file, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    const { data, error: dbError } = await supabase
      .from('pet_photos')
      .insert({
        pet_id: petId,
        customer_id: customerResult.customer.id,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
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
