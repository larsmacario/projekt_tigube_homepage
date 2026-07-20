import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { PET_PHOTOS_BUCKET, PET_PHOTO_SIGNED_URL_TTL } from '@/lib/pet-photos'
import type { PetPhoto } from '@/lib/types'

async function attachSignedUrls(
  supabase: SupabaseClient,
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
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: pet, error: petError } = await auth.client
      .from('pets')
      .select('id')
      .eq('id', petId)
      .maybeSingle()

    if (petError) throw petError
    if (!pet) {
      return NextResponse.json({ error: 'Tier nicht gefunden' }, { status: 404 })
    }

    const { data, error } = await auth.client
      .from('pet_photos')
      .select('*')
      .eq('pet_id', petId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error

    const photos = await attachSignedUrls(auth.client, (data || []) as PetPhoto[])
    return NextResponse.json({ photos })
  } catch (error: unknown) {
    console.error('Error fetching admin pet photos:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Fotos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
