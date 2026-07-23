import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { validateBookingAvailabilityForRange } from '@/lib/booking-availability-server'
import type { ServiceType } from '@/lib/types'

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
      return NextResponse.json({ bookings: [] })
    }

    // Hole Customer-ID
    const { data: customer } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userData.id)
      .eq('contact_type', 'customer')
      .single()

    if (!customer) {
      return NextResponse.json({ bookings: [] })
    }

    // Parse query parameters für Filter
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') // 'past', 'current', 'future'

    let query = supabase
      .from('bookings')
      .select(`
        *,
        pet:pets(id, name, tierart),
        customer:contacts!bookings_customer_id_fkey(id, vorname, nachname)
      `)
      .eq('customer_id', customer.id)
      .order('start_date', { ascending: false })

    // Filter nach Zeitraum
    const today = new Date().toISOString().split('T')[0]
    
    if (filter === 'past') {
      query = query.lt('end_date', today)
    } else if (filter === 'current') {
      query = query.lte('start_date', today).gte('end_date', today)
    } else if (filter === 'future') {
      query = query.gt('start_date', today)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ bookings: data || [] })
  } catch (error: any) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Buchungen' },
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

    const bookingData = await request.json()
    const { pet_id, service_type, start_date, end_date, message } = bookingData

    // Validierung
    if (!pet_id || !service_type || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen' },
        { status: 400 }
      )
    }

    // Prüfe ob das Tier dem Kunden gehört
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, customer_id')
      .eq('id', pet_id)
      .single()

    if (petError || !pet || pet.customer_id !== customer.id) {
      return NextResponse.json(
        { error: 'Tier nicht gefunden oder gehört nicht zu diesem Kunden' },
        { status: 403 }
      )
    }

    // Prüfe ob end_date >= start_date
    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json(
        { error: 'Enddatum muss nach Startdatum liegen' },
        { status: 400 }
      )
    }

    const availability = await validateBookingAvailabilityForRange({
      serviceType: service_type as ServiceType,
      startDate: start_date,
      endDate: end_date,
      checkCapacity: false,
    })

    if (!availability.valid) {
      return NextResponse.json(
        { error: availability.error || 'Der gewählte Zeitraum ist nicht verfügbar.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_id: customer.id,
        pet_id,
        service_type,
        start_date,
        end_date,
        message: message || null,
        status: 'pending',
      })
      .select(`
        *,
        pet:pets(id, name, tierart),
        customer:contacts!bookings_customer_id_fkey(id, vorname, nachname)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ booking: data })
  } catch (error: any) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen der Buchung' },
      { status: 500 }
    )
  }
}

