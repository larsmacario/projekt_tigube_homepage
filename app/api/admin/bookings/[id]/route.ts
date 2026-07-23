import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { validateBookingAvailabilityForRange } from '@/lib/booking-availability-server'
import type { ServiceType } from '@/lib/types'

async function checkAdminAuth(supabase: any, accessToken: string | undefined) {
  if (!accessToken) {
    return { error: 'Nicht autorisiert - Keine Session gefunden', status: 401, userData: null }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Nicht autorisiert', status: 401, userData: null }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Nicht autorisiert', status: 403, userData: null }
  }

  return { error: null, status: 200, userData }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const bookingId = params.id
    const body = await request.json()
    const { status, admin_notes } = body

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Ungültiger Status' },
        { status: 400 }
      )
    }

    const { data: existingBooking, error: existingError } = await supabase
      .from('bookings')
      .select('id, service_type, start_date, end_date, status')
      .eq('id', bookingId)
      .single()

    if (existingError || !existingBooking) {
      return NextResponse.json(
        { error: 'Buchung nicht gefunden' },
        { status: 404 }
      )
    }

    if (status === 'approved') {
      const availability = await validateBookingAvailabilityForRange({
        serviceType: existingBooking.service_type as ServiceType,
        startDate: existingBooking.start_date,
        endDate: existingBooking.end_date,
        excludeBookingId: existingBooking.id,
        checkCapacity: true,
      })

      if (!availability.valid) {
        return NextResponse.json(
          { error: availability.error || 'Die Buchung kann nicht genehmigt werden.' },
          { status: 409 }
        )
      }
    }

    const updateData: any = {
      status,
      responded_at: new Date().toISOString(),
      responded_by: authResult.userData!.id,
    }

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select(`
        *,
        pet:pets(id, name, tierart),
        customer:contacts!bookings_customer_id_fkey(id, vorname, nachname, email, telefonnummer),
        responded_by_user:users!bookings_responded_by_fkey(id, email)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ booking: data })
  } catch (error: any) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren der Buchung' },
      { status: 500 }
    )
  }
}

