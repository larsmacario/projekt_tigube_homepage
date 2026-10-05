import { NextRequest, NextResponse } from 'next/server'

import { getAdminDbClient, getServerClient } from '@/lib/admin-auth'
import {
  applyBookingModification,
  buildModificationPreview,
  loadModificationContextForBooking,
  parseModificationPayload,
} from '@/lib/booking-modification-server'
import type { BookingLineItem, BookingRequest } from '@/lib/types'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

async function resolvePortalCustomer(supabase: Awaited<ReturnType<typeof getServerClient>>['client']) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { error: 'Nicht autorisiert', status: 401 as const }

  const { data: customer } = await supabase
    .from('contacts')
    .select('id, email, vorname, nachname')
    .eq('user_id', user.id)
    .eq('contact_type', 'customer')
    .maybeSingle()

  if (!customer) return { error: 'Kunde nicht gefunden', status: 404 as const }
  return { customer, userId: user.id }
}

async function loadBookingContext(bookingId: string, customerId: string) {
  const admin = getAdminDbClient()

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select(`
      *,
      pet:pets(id, name),
      customer:contacts(id, email, vorname, nachname)
    `)
    .eq('id', bookingId)
    .eq('customer_id', customerId)
    .maybeSingle()

  if (bookingError || !booking) {
    return { error: 'Buchung nicht gefunden', status: 404 as const }
  }

  const typedBooking = booking as BookingRequest

  if (typedBooking.status === 'cancelled') {
    return { error: 'Stornierte Buchungen können nicht angepasst werden.', status: 409 as const }
  }

  if (typedBooking.status === 'rejected') {
    return { error: 'Abgelehnte Buchungen können nicht angepasst werden.', status: 409 as const }
  }

  let lineItems: BookingLineItem[] = []
  if (typedBooking.request_group_id) {
    const { data } = await admin
      .from('booking_line_items')
      .select('*')
      .eq('request_group_id', typedBooking.request_group_id)
    lineItems = (data ?? []) as BookingLineItem[]
  }

  return { booking: typedBooking, lineItems, userId: null as string | null }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { client: supabase } = await getServerClient(request)
    const customerResult = await resolvePortalCustomer(supabase)
    if ('error' in customerResult) {
      return NextResponse.json({ error: customerResult.error }, { status: customerResult.status })
    }

    const bookingResult = await loadBookingContext(id, customerResult.customer.id)
    if ('error' in bookingResult) {
      return NextResponse.json({ error: bookingResult.error }, { status: bookingResult.status })
    }

    const { searchParams } = new URL(request.url)
    const payload = parseModificationPayload({
      start_date: searchParams.get('start_date') ?? undefined,
      end_date: searchParams.get('end_date') ?? undefined,
      selected_dates: searchParams.get('selected_dates') ?? undefined,
      day_care_weekdays: searchParams.get('day_care_weekdays') ?? undefined,
      day_care_interval_weeks: searchParams.get('day_care_interval_weeks') ?? undefined,
      drop_off_time: searchParams.get('drop_off_time') ?? undefined,
      pick_up_time: searchParams.get('pick_up_time') ?? undefined,
    })

    const contextOnly = searchParams.get('context') === '1'
    const context = await loadModificationContextForBooking(bookingResult.booking)

    if (contextOnly && !payload.start_date && !payload.selected_dates?.length) {
      return NextResponse.json({ context })
    }

    const preview = await buildModificationPreview({
      booking: bookingResult.booking,
      lineItems: bookingResult.lineItems,
      payload,
      requestGroup: context,
    })

    return NextResponse.json({ preview, context })
  } catch (error: unknown) {
    console.error('Modification preview error:', error)
    const message = error instanceof Error ? error.message : 'Vorschau fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { client: supabase, accessToken } = await getServerClient(request)
    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const customerResult = await resolvePortalCustomer(supabase)
    if ('error' in customerResult) {
      return NextResponse.json({ error: customerResult.error }, { status: customerResult.status })
    }

    const body = await request.json().catch(() => ({}))
    const payload = parseModificationPayload(body)

    const bookingResult = await loadBookingContext(id, customerResult.customer.id)
    if ('error' in bookingResult) {
      return NextResponse.json({ error: bookingResult.error }, { status: bookingResult.status })
    }

    const result = await applyBookingModification({
      booking: bookingResult.booking,
      lineItems: bookingResult.lineItems,
      payload,
      userId: customerResult.userId,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Modification apply error:', error)
    const message = error instanceof Error ? error.message : 'Anpassung fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
