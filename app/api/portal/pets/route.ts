import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { normalizePetsWithPhotos, PET_PHOTOS_SELECT } from '@/lib/pet-photos'
import { normalizePetPayload, validatePetPayload } from '@/lib/pet-payload'

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

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!userData) {
      return NextResponse.json({ pets: [] })
    }

    // Hole Customer-ID
    const { data: customer } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userData.id)
      .eq('contact_type', 'customer')
      .single()

    if (!customer) {
      return NextResponse.json({ pets: [] })
    }

    const { data, error } = await supabase
      .from('pets')
      .select(`*, ${PET_PHOTOS_SELECT}`)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const pets = await normalizePetsWithPhotos(supabase, data || [])

    return NextResponse.json({ pets })
  } catch (error: any) {
    console.error('Error fetching pets:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Tiere' },
      { status: 500 }
    )
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

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'User-Daten nicht gefunden' },
        { status: 401 }
      )
    }

    // Hole Customer-ID
    const { data: customer } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userData.id)
      .eq('contact_type', 'customer')
      .single()

    if (!customer) {
      return NextResponse.json(
        { error: 'Kundenprofil nicht gefunden' },
        { status: 404 }
      )
    }

    const petData = normalizePetPayload(await request.json())
    const validationError = validatePetPayload(petData)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('pets')
      .insert({
        customer_id: customer.id,
        ...petData,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ pet: data })
  } catch (error: any) {
    console.error('Error creating pet:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen des Tieres' },
      { status: 500 }
    )
  }
}


