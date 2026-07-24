import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { PET_EDITABLE_FIELDS, pickAllowedFields } from '@/lib/contact-editable-fields'
import { deletePetPhotoStorageFiles } from '@/lib/portal-customer'
import { normalizePetPayload, validatePetPayload } from '@/lib/pet-payload'
import { getPortalCustomer, assertPetOwnership } from '@/lib/portal-customer'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: petId } = await params
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

    const updates = normalizePetPayload(
      pickAllowedFields(body, PET_EDITABLE_FIELDS)
    )
    const validationError = validatePetPayload(updates)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const ownership = await assertPetOwnership(supabase, petId, customerResult.customer.id)
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status })
    }

    const { data, error } = await supabase
      .from('pets')
      .update(updates)
      .eq('id', petId)
      .eq('customer_id', customerResult.customer.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating pet:', error)
      return NextResponse.json(
        { error: error.message || 'Fehler beim Aktualisieren des Tieres' },
        { status: 500 }
      )
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: petId } = await params
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


