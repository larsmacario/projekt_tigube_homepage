import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { deletePetPhotoStorageFiles } from '@/lib/portal-customer'
import { normalizePetPayload, validatePetPayload } from '@/lib/pet-payload'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const petId = params.id
    const updates = normalizePetPayload(await request.json())
    const validationError = validatePetPayload(updates)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Prüfe ob Pet zum User gehört
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

    const { data, error } = await supabase
      .from('pets')
      .update(updates)
      .eq('id', petId)
      .eq('customer_id', customer.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Tier nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ pet: data })
  } catch (error: any) {
    console.error('Error updating pet:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren des Tieres' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const petId = params.id

    // Prüfe ob Pet zum User gehört
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

    const { data: photos } = await supabase
      .from('pet_photos')
      .select('file_path')
      .eq('pet_id', petId)
      .eq('customer_id', customer.id)

    if (photos?.length) {
      await deletePetPhotoStorageFiles(
        supabase,
        photos.map((photo) => photo.file_path)
      )
    }

    const { error } = await supabase
      .from('pets')
      .delete()
      .eq('id', petId)
      .eq('customer_id', customer.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting pet:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen des Tieres' },
      { status: 500 }
    )
  }
}


