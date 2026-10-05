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

async function checkAdminAuth(supabase: Awaited<ReturnType<typeof getServerClient>>['client'], accessToken: string | undefined) {
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

async function loadAdminBookingContext(bookingId: string) {
  const admin = getAdminDbClient()
  const { data: booking, error } = await admin
    .from('bookings')
    .select(`
      *,
      pet:pets(id, name),
      customer:contacts!bookings_customer_id_fkey(id, vorname, nachname, email)
    `)
    .eq('id', bookingId)
    .single()

  if (error || !booking) {
    return { error: 'Buchung nicht gefunden', status: 404 as const }
  }

  const typed = booking as BookingRequest
  if (typed.status === 'cancelled' || typed.status === 'rejected') {
    return { error: 'Diese Buchung kann nicht angepasst werden.', status: 409 as const }
  }

  let lineItems: BookingLineItem[] = []
  const groupKey = typed.request_group_id ?? typed.id
  const { data } = await admin.from('booking_line_items').select('*').eq('request_group_id', groupKey)
  lineItems = (data ?? []) as BookingLineItem[]

  return { booking: typed, lineItems }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const ctx = await loadAdminBookingContext(id)
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const { searchParams } = new URL(request.url)
    const waive = searchParams.get('waive_cancellation') === '1'
    const payload = parseModificationPayload({
      start_date: searchParams.get('start_date') ?? undefined,
      end_date: searchParams.get('end_date') ?? undefined,
      selected_dates: searchParams.get('selected_dates') ?? undefined,
      day_care_weekdays: searchParams.get('day_care_weekdays') ?? undefined,
      day_care_interval_weeks: searchParams.get('day_care_interval_weeks') ?? undefined,
      drop_off_time: searchParams.get('drop_off_time') ?? undefined,
      pick_up_time: searchParams.get('pick_up_time') ?? undefined,
    })

    const context = await loadModificationContextForBooking(ctx.booking)
    const contextOnly = searchParams.get('context') === '1'
    if (contextOnly && !payload.start_date && !payload.selected_dates?.length) {
      return NextResponse.json({ context })
    }

    const preview = await buildModificationPreview({
      booking: ctx.booking,
      lineItems: ctx.lineItems,
      payload,
      requestGroup: context,
      waiveCancellation: waive,
    })

    return NextResponse.json({ preview, context })
  } catch (error: unknown) {
    console.error('Admin modification preview error:', error)
    const message = error instanceof Error ? error.message : 'Vorschau fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)
    if (authResult.error || !authResult.userData) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json().catch(() => ({}))
    const payload = parseModificationPayload(body)
    const waiveCancellation = body.waiveCancellation === true

    const ctx = await loadAdminBookingContext(id)
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const result = await applyBookingModification({
      booking: ctx.booking,
      lineItems: ctx.lineItems,
      payload,
      userId: authResult.userData.id,
      waiveCancellation,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Admin modification apply error:', error)
    const message = error instanceof Error ? error.message : 'Anpassung fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
