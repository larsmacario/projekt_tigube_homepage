import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { PET_EDITABLE_FIELDS, pickAllowedFields } from '@/lib/contact-editable-fields'
import { normalizePetsWithPhotos, normalizePetWithPhotoCount, PET_PHOTOS_SELECT } from '@/lib/pet-photos'
import { normalizePetPayload, validatePetPayload } from '@/lib/pet-payload'
import { getPortalCustomer } from '@/lib/portal-customer'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const customerResult = await getPortalCustomer(supabase, authUser.id)
    if ('error' in customerResult) {
      if (customerResult.status === 404) {
        return NextResponse.json({ pets: [] })
      }
      return NextResponse.json(
        { error: customerResult.error },
        { status: customerResult.status }
      )
    }

    const { data, error } = await supabase
      .from('pets')
      .select(`*, ${PET_PHOTOS_SELECT}`)
      .eq('customer_id', customerResult.customer.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Pets with pet_photos embed failed, falling back:', error.message)
      const { data: basicPets, error: basicError } = await supabase
        .from('pets')
        .select('*')
        .eq('customer_id', customerResult.customer.id)
        .order('created_at', { ascending: false })

      if (basicError) {
        throw basicError
      }

      const pets = (basicPets || []).map((pet) => ({
        ...normalizePetWithPhotoCount({ ...pet, pet_photos: [] }),
        primary_photo_url: null as string | null,
      }))

      return NextResponse.json({ pets })
    }

    try {
      const pets = await normalizePetsWithPhotos(supabase, data || [])
      return NextResponse.json({ pets })
    } catch (photoError) {
      console.error('Pet photo normalization failed, returning basic pets:', photoError)
      const pets = (data || []).map((pet) => ({
        ...normalizePetWithPhotoCount({
          ...(pet as Record<string, unknown>),
          pet_photos: (pet as { pet_photos?: unknown }).pet_photos ?? [],
        }),
        primary_photo_url: null as string | null,
      }))
      return NextResponse.json({ pets })
    }
  } catch (error: unknown) {
    console.error('Error fetching pets:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Laden der Tiere'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const customerResult = await getPortalCustomer(supabase, authUser.id)
    if ('error' in customerResult) {
      return NextResponse.json(
        { error: customerResult.error },
        { status: customerResult.status }
      )
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Ungültiger Anfrage-Body' }, { status: 400 })
    }

    const petData = normalizePetPayload(
      pickAllowedFields(body, PET_EDITABLE_FIELDS)
    )
    const validationError = validatePetPayload(petData)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('pets')
      .insert({
        customer_id: customerResult.customer.id,
        ...petData,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating pet:', error)
      return NextResponse.json(
        { error: error.message || 'Fehler beim Erstellen des Tieres' },
        { status: 500 }
      )
    }

    return NextResponse.json({ pet: data })
  } catch (error: any) {
    console.error('Error creating pet:', error)
    return NextResponse.json(
      { error: error?.message || 'Fehler beim Erstellen des Tieres' },
      { status: 500 }
    )
  }
}


