import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { PET_PHOTOS_BUCKET, PET_PHOTO_SIGNED_URL_TTL } from '@/lib/pet-photos'
import { assertPetOwnership, getPortalCustomer } from '@/lib/portal-customer'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id: petId, photoId } = await props.params
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

    const { data: photo, error: photoError } = await supabase
      .from('pet_photos')
      .select('*')
      .eq('id', photoId)
      .eq('pet_id', petId)
      .maybeSingle()

    if (photoError) throw photoError
    if (!photo) {
      return NextResponse.json({ error: 'Foto nicht gefunden' }, { status: 404 })
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from(PET_PHOTOS_BUCKET)
      .createSignedUrl(photo.file_path, PET_PHOTO_SIGNED_URL_TTL)

    if (signedError || !signedData?.signedUrl) {
      throw signedError || new Error('Signed URL konnte nicht erstellt werden')
    }

    return NextResponse.json({ signedUrl: signedData.signedUrl })
  } catch (error: unknown) {
    console.error('Error generating pet photo URL:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Abrufen des Fotos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id: petId, photoId } = await props.params
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

    const { data: photo, error: photoError } = await supabase
      .from('pet_photos')
      .select('*')
      .eq('id', photoId)
      .eq('pet_id', petId)
      .maybeSingle()

    if (photoError) throw photoError
    if (!photo) {
      return NextResponse.json({ error: 'Foto nicht gefunden' }, { status: 404 })
    }

    const { error: storageError } = await supabase.storage
      .from(PET_PHOTOS_BUCKET)
      .remove([photo.file_path])

    if (storageError) {
      console.error('Pet photo storage delete error:', storageError)
    }

    const { error: dbError } = await supabase
      .from('pet_photos')
      .delete()
      .eq('id', photoId)

    if (dbError) throw dbError

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting pet photo:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Löschen des Fotos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
