import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getAdminDbClient } from '@/lib/admin-auth'
import { CUSTOMER_EDITABLE_FIELDS, pickAllowedFields } from '@/lib/contact-editable-fields'
import {
  CUSTOMER_DOCUMENTS_BUCKET,
  normalizeCustomerDocumentStoragePath,
} from '@/lib/customer-documents'
import { normalizePetsWithPhotos, PET_PHOTOS_SELECT } from '@/lib/pet-photos'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Prüfe ob User eingeloggt ist
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Prüfe Admin-Rechte
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const customerId = params.id

    // Hole Customer mit allen verknüpften Daten
    const { data: customer, error: customerError } = await supabase
      .from('contacts')
      .select(`*, pets(*, ${PET_PHOTOS_SELECT}), documents(*)`)
      .eq('id', customerId)
      .eq('contact_type', 'customer')
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Kunde nicht gefunden' },
        { status: 404 }
      )
    }

    const pets = await normalizePetsWithPhotos(supabase, customer.pets || [])
    const customerWithPets = { ...customer, pets }

    // Hole Onboarding-Token, falls vorhanden und Onboarding unvollständig
    let onboardingToken = null
    if (!customer.onboarding_completed) {
      const { data: tokenData } = await supabase
        .from('onboarding_tokens')
        .select('token, used')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (tokenData) {
        const host = request.headers.get('host') || 'localhost:3000'
        const protocol = request.headers.get('x-forwarded-proto') || 'http'
        const baseUrl = `${protocol}://${host}`
        onboardingToken = {
          token: tokenData.token,
          url: `${baseUrl}/onboarding/${tokenData.token}`,
        }
      }
    }

    return NextResponse.json({ customer: customerWithPets, onboardingToken })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Prüfe ob User eingeloggt ist
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Prüfe Admin-Rechte
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const customerId = params.id
    const rawUpdates = await request.json()
    const updates = pickAllowedFields(rawUpdates, CUSTOMER_EDITABLE_FIELDS)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Felder zum Aktualisieren' },
        { status: 400 }
      )
    }

    const { data: customer, error: customerError } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', customerId)
      .eq('contact_type', 'customer')
      .select()
      .single()

    if (customerError) {
      throw customerError
    }

    return NextResponse.json({ customer })
  } catch (error: any) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const adminSupabase = getAdminDbClient()

    const customerId = params.id
    const { data: customer, error: customerError } = await adminSupabase
      .from('contacts')
      .select('id')
      .eq('id', customerId)
      .eq('contact_type', 'customer')
      .maybeSingle()
    if (customerError) throw customerError
    if (!customer) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 })
    }

    const { data: documents, error: documentsError } = await adminSupabase
      .from('documents')
      .select('file_path')
      .eq('customer_id', customerId)
    if (documentsError) throw documentsError

    const documentPaths = (documents || [])
      .map((document) => document.file_path)
      .filter(Boolean)
      .map((filePath) => normalizeCustomerDocumentStoragePath(filePath))
    if (documentPaths.length > 0) {
      const { error: storageError } = await adminSupabase.storage
        .from(CUSTOMER_DOCUMENTS_BUCKET)
        .remove(documentPaths)
      if (storageError) throw storageError
    }

    const { error: bookingsError } = await adminSupabase
      .from('bookings')
      .delete()
      .eq('customer_id', customerId)
    if (bookingsError) throw bookingsError

    const { error: documentsDeleteError } = await adminSupabase
      .from('documents')
      .delete()
      .eq('customer_id', customerId)
    if (documentsDeleteError) throw documentsDeleteError

    const { error: petsError } = await adminSupabase
      .from('pets')
      .delete()
      .eq('customer_id', customerId)
    if (petsError) throw petsError

    const { error: tokensError } = await adminSupabase
      .from('onboarding_tokens')
      .delete()
      .eq('customer_id', customerId)
    if (tokensError) throw tokensError

    const { error: notesError } = await adminSupabase
      .from('notes')
      .delete()
      .eq('contact_id', customerId)
    if (notesError) throw notesError

    const { error: propertiesError } = await adminSupabase
      .from('property_values')
      .delete()
      .eq('entity_type', 'customer')
      .eq('entity_id', customerId)
    if (propertiesError) throw propertiesError

    const { data: deletedCustomer, error: deleteError } = await adminSupabase
      .from('contacts')
      .delete()
      .eq('id', customerId)
      .eq('contact_type', 'customer')
      .select('id')
      .maybeSingle()
    if (deleteError) throw deleteError
    if (!deletedCustomer) {
      throw new Error('Kunde konnte nicht gelöscht werden')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen des Kunden' },
      { status: 500 }
    )
  }
}
