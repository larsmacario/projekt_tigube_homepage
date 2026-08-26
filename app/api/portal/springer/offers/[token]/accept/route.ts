import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminDbClient, getServerClient } from '@/lib/admin-auth'
import { getPortalCustomer } from '@/lib/portal-customer'
import { isOfferAcceptable } from '@/lib/springer'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ token: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    if (!token) {
      return NextResponse.json({ error: 'Token fehlt' }, { status: 400 })
    }

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

    const { data: offer, error: offerError } = await supabase
      .from('springer_offers')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (offerError) {
      throw offerError
    }

    if (!offer) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })
    }

    if (offer.customer_id !== customerResult.customer.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    if (offer.status === 'closed') {
      return NextResponse.json(
        { error: 'Dieses Angebot ist bereits geschlossen' },
        { status: 410 }
      )
    }

    if (offer.status === 'responded' || offer.response_booking_id) {
      return NextResponse.json(
        { error: 'Du hast dieses Angebot bereits angenommen' },
        { status: 409 }
      )
    }

    if (!isOfferAcceptable(offer)) {
      return NextResponse.json(
        { error: 'Dieses Angebot ist nicht mehr verfügbar' },
        { status: 410 }
      )
    }

    const admin = getAdminDbClient()

    // Re-check under admin client to avoid race with close
    const { data: freshOffer, error: freshError } = await admin
      .from('springer_offers')
      .select('*')
      .eq('id', offer.id)
      .maybeSingle()

    if (freshError) {
      throw freshError
    }

    if (!freshOffer || freshOffer.status === 'closed') {
      return NextResponse.json(
        { error: 'Dieses Angebot ist bereits geschlossen' },
        { status: 410 }
      )
    }

    if (freshOffer.status === 'responded' || freshOffer.response_booking_id) {
      return NextResponse.json(
        { error: 'Du hast dieses Angebot bereits angenommen' },
        { status: 409 }
      )
    }

    if (!isOfferAcceptable(freshOffer)) {
      return NextResponse.json(
        { error: 'Dieses Angebot ist nicht mehr verfügbar' },
        { status: 410 }
      )
    }

    const offerDate = freshOffer.offer_date
    const requestGroupId = randomUUID()

    const { error: groupError } = await admin.from('booking_request_groups').insert({
      id: requestGroupId,
      customer_id: freshOffer.customer_id,
      drop_off_time: null,
      pick_up_time: null,
    })

    if (groupError) {
      throw groupError
    }

    const { data: booking, error: bookingError } = await admin
      .from('bookings')
      .insert({
        customer_id: freshOffer.customer_id,
        pet_id: freshOffer.pet_id,
        service_type: 'tagesbetreuung',
        day_care_mode: 'once',
        selected_dates: [offerDate],
        day_care_weekdays: null,
        day_care_interval_weeks: null,
        start_date: offerDate,
        end_date: offerDate,
        status: 'pending',
        request_group_id: requestGroupId,
        message: 'Buchung über Springerliste',
      })
      .select()
      .single()

    if (bookingError) {
      throw bookingError
    }

    const now = new Date().toISOString()
    const { data: updatedOffer, error: updateError } = await admin
      .from('springer_offers')
      .update({
        status: 'responded',
        response_booking_id: booking.id,
        updated_at: now,
      })
      .eq('id', freshOffer.id)
      .eq('status', freshOffer.status)
      .select()
      .maybeSingle()

    if (updateError) {
      throw updateError
    }

    if (!updatedOffer) {
      // Offer was closed concurrently – booking remains as pending request
      return NextResponse.json(
        { error: 'Dieses Angebot ist bereits geschlossen' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      offer: updatedOffer,
      booking,
    })
  } catch (error: unknown) {
    console.error('Error accepting springer offer:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Annehmen des Angebots'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
