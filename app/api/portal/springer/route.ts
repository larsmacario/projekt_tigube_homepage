import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { getPortalCustomer, assertPetOwnership } from '@/lib/portal-customer'
import { normalizeSpringerWeekdays } from '@/lib/springer'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const customerResult = await getPortalCustomer(supabase, authUser.id)
    if ('error' in customerResult) {
      if (customerResult.status === 404) {
        return NextResponse.json({ registrations: [] })
      }
      return NextResponse.json(
        { error: customerResult.error },
        { status: customerResult.status }
      )
    }

    const { data, error } = await supabase
      .from('springer_registrations')
      .select(
        `
        *,
        pet:pets(id, name, tierart)
      `
      )
      .eq('customer_id', customerResult.customer.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ registrations: data || [] })
  } catch (error: unknown) {
    console.error('Error fetching springer registrations:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Laden der Springerliste'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
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

    const petId = typeof body.pet_id === 'string' ? body.pet_id : ''
    if (!petId) {
      return NextResponse.json({ error: 'pet_id ist erforderlich' }, { status: 400 })
    }

    const weekdays = normalizeSpringerWeekdays(body.weekdays)
    if (!weekdays) {
      return NextResponse.json(
        { error: 'Mindestens ein gültiger Wochentag (1–7) ist erforderlich' },
        { status: 400 }
      )
    }

    const ownership = await assertPetOwnership(supabase, petId, customerResult.customer.id)
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status })
    }

    const isActive = typeof body.is_active === 'boolean' ? body.is_active : true
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('springer_registrations')
      .upsert(
        {
          customer_id: customerResult.customer.id,
          pet_id: petId,
          weekdays,
          is_active: isActive,
          updated_at: now,
        },
        { onConflict: 'pet_id' }
      )
      .select(
        `
        *,
        pet:pets(id, name, tierart)
      `
      )
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ registration: data })
  } catch (error: unknown) {
    console.error('Error upserting springer registration:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Speichern der Springerliste'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const customerResult = await getPortalCustomer(supabase, authUser.id)
    if ('error' in customerResult) {
      return NextResponse.json(
        { error: customerResult.error },
        { status: customerResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('pet_id')
    const registrationId = searchParams.get('id')

    if (!petId && !registrationId) {
      return NextResponse.json(
        { error: 'pet_id oder id ist erforderlich' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('springer_registrations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('customer_id', customerResult.customer.id)

    if (registrationId) {
      query = query.eq('id', registrationId)
    } else if (petId) {
      query = query.eq('pet_id', petId)
    }

    const { data, error } = await query.select().maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ registration: data })
  } catch (error: unknown) {
    console.error('Error deactivating springer registration:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Deaktivieren der Springerliste'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
