import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { PET_EDITABLE_FIELDS, pickAllowedFields } from '@/lib/contact-editable-fields'
import { normalizePetPayload, validatePetPayload } from '@/lib/pet-payload'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const customerId = new URL(request.url).searchParams.get('customer_id')
    if (!customerId) {
      return NextResponse.json({ error: 'customer_id ist erforderlich' }, { status: 400 })
    }

    const { data, error } = await auth.client
      .from('pets')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ pets: data || [] })
  } catch (error: any) {
    console.error('Error fetching admin pets:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Tiere' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const customerId = body.customer_id as string | undefined
    if (!customerId) {
      return NextResponse.json({ error: 'customer_id ist erforderlich' }, { status: 400 })
    }

    const { data: customer, error: customerError } = await auth.client
      .from('contacts')
      .select('id')
      .eq('id', customerId)
      .eq('contact_type', 'customer')
      .maybeSingle()

    if (customerError) throw customerError
    if (!customer) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 })
    }

    const petData = normalizePetPayload(pickAllowedFields(body, PET_EDITABLE_FIELDS))
    if (!petData.name || typeof petData.name !== 'string' || !petData.name.trim()) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    const validationError = validatePetPayload(petData)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { data, error } = await auth.client
      .from('pets')
      .insert({
        customer_id: customerId,
        ...petData,
        name: (petData.name as string).trim(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ pet: data })
  } catch (error: any) {
    console.error('Error creating admin pet:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen des Tieres' },
      { status: 500 }
    )
  }
}
