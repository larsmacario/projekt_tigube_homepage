import { NextRequest, NextResponse } from 'next/server'

import { getAdminDbClient, getServerClient } from '@/lib/admin-auth'
import {
  getActiveBookingDates,
  getBookingFinancialTotal,
  isBookingFullyCancelled,
  resolveCancellationCheckInDate,
} from '@/lib/cancellation-booking-total'
import { resolveScopeTotalForCancelledDates } from '@/lib/cancellation-day-price'
import { loadActiveCancellationPolicy } from '@/lib/cancellation-policy-loader'
import { calculateCancellationAmounts } from '@/lib/cancellation-resolver'
import { buildBookingCancellationEmailContent } from '@/lib/booking-cancellation-email'
import { sendBookingCancellationEmails } from '@/lib/email'
import { getPublicHolidaysInRange } from '@/lib/public-holidays-de'
import { fetchSchoolHolidaysBw } from '@/lib/school-holidays-bw'
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

  const typedBooking = booking as BookingRequest & {
    pet?: { id: string; name: string }
    customer?: { id: string; email: string; vorname: string | null; nachname: string | null }
  }

  if (typedBooking.status === 'cancelled') {
    return { error: 'Diese Buchung ist bereits storniert.', status: 409 as const }
  }

  if (typedBooking.status === 'rejected') {
    return { error: 'Abgelehnte Buchungen können nicht storniert werden.', status: 409 as const }
  }

  let lineItems: BookingLineItem[] = []
  if (typedBooking.request_group_id) {
    const { data } = await admin
      .from('booking_line_items')
      .select('*')
      .eq('request_group_id', typedBooking.request_group_id)
    lineItems = (data ?? []) as BookingLineItem[]
  }

  return { booking: typedBooking, lineItems, admin }
}

async function computeCancellationPreview(
  booking: BookingRequest,
  lineItems: BookingLineItem[],
  datesToCancel?: string[],
  cancellationAt = new Date()
) {
  const { config } = await loadActiveCancellationPolicy(getAdminDbClient())
  const schoolHolidays = await fetchSchoolHolidaysBw().catch(() => [])
  const bookingTotal = getBookingFinancialTotal(booking.id, lineItems)
  const activeDates = getActiveBookingDates(booking)

  if (datesToCancel?.length) {
    const activeSet = new Set(activeDates)
    const invalid = datesToCancel.filter((d) => !activeSet.has(d))
    if (invalid.length > 0) {
      throw new Error('Ein oder mehrere Tage gehören nicht zu dieser Buchung.')
    }
  }

  const mergedCancelledDates = [
    ...(booking.cancelled_dates ?? []),
    ...(datesToCancel ?? []),
  ]

  let holidayDates: string[] = []
  if (datesToCancel?.length) {
    const sorted = [...datesToCancel].sort()
    try {
      holidayDates = (
        await getPublicHolidaysInRange(sorted[0], sorted[sorted.length - 1])
      ).map((h) => h.date)
    } catch {
      holidayDates = []
    }
  }

  const scope = datesToCancel?.length
    ? resolveScopeTotalForCancelledDates({
        booking,
        lineItems,
        datesToCancel,
        bookingTotal,
        holidayDates,
      })
    : {
        scopeTotal: bookingTotal,
        priceSnapshot: { perDay: [], dayCount: 0, method: 'full' as const },
      }

  const checkInDate = resolveCancellationCheckInDate(booking, datesToCancel)
  const calculation = calculateCancellationAmounts({
    checkInDate,
    bookingStartDate: booking.start_date,
    bookingEndDate: booking.end_date,
    selectedDates: booking.selected_dates,
    cancelledDates: mergedCancelledDates,
    cancellationAt,
    bookingTotal,
    scopeTotalOverride: datesToCancel?.length ? scope.scopeTotal : undefined,
    policy: config,
    schoolHolidays,
  })

  return {
    ...calculation,
    bookingTotal,
    fullyCancelled: isBookingFullyCancelled(booking, datesToCancel ?? []),
    datesToCancel: datesToCancel ?? [],
    priceSnapshot: scope.priceSnapshot,
    canCancel: scope.scopeTotal > 0 || bookingTotal > 0 || booking.status !== 'pending',
  }
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
    const datesParam = searchParams.get('dates')
    const datesToCancel = datesParam
      ? datesParam.split(',').map((d) => d.trim()).filter(Boolean)
      : undefined

    const preview = await computeCancellationPreview(
      bookingResult.booking,
      bookingResult.lineItems,
      datesToCancel
    )

    return NextResponse.json({ preview })
  } catch (error: unknown) {
    console.error('Cancellation preview error:', error)
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
    const datesToCancel = Array.isArray(body.dates)
      ? body.dates.filter((d: unknown): d is string => typeof d === 'string')
      : undefined

    const bookingResult = await loadBookingContext(id, customerResult.customer.id)
    if ('error' in bookingResult) {
      return NextResponse.json({ error: bookingResult.error }, { status: bookingResult.status })
    }

    const cancellationAt = new Date()
    const preview = await computeCancellationPreview(
      bookingResult.booking,
      bookingResult.lineItems,
      datesToCancel,
      cancellationAt
    )

    const { booking, admin } = bookingResult
    const mergedCancelledDates = [
      ...new Set([...(booking.cancelled_dates ?? []), ...(datesToCancel ?? [])]),
    ]
    const fullyCancelled =
      preview.fullyCancelled ||
      (datesToCancel?.length ? isBookingFullyCancelled(booking, datesToCancel) : true)

    const updatePayload: Record<string, unknown> = {
      cancelled_at: cancellationAt.toISOString(),
      cancelled_by: customerResult.userId,
      cancellation_charge_amount: preview.cancellationChargeAmount,
      cancellation_refund_amount: preview.cancellationRefundAmount,
      cancellation_policy_snapshot: preview.policySnapshot,
      cancellation_rule_set_id: preview.ruleSetId,
      cancellation_tier_label: preview.tierLabel,
      cancellation_financial_status: 'pending',
      cancelled_dates: mergedCancelledDates,
      updated_at: cancellationAt.toISOString(),
    }

    if (fullyCancelled) {
      updatePayload.status = 'cancelled'
    }

    const { data: updatedBooking, error: updateError } = await admin
      .from('bookings')
      .update(updatePayload)
      .eq('id', booking.id)
      .select(`
        *,
        pet:pets(id, name),
        customer:contacts(id, email, vorname, nachname)
      `)
      .single()

    if (updateError || !updatedBooking) {
      throw updateError ?? new Error('Storno konnte nicht gespeichert werden')
    }

    if (datesToCancel?.length) {
      const { error: eventError } = await admin.from('booking_cancellation_events').insert({
        booking_id: booking.id,
        customer_id: booking.customer_id,
        cancelled_dates: datesToCancel,
        booking_total: preview.bookingTotal,
        cancellation_charge_amount: preview.cancellationChargeAmount,
        cancellation_refund_amount: preview.cancellationRefundAmount,
        cancellation_rule_set_id: preview.ruleSetId,
        cancellation_tier_label: preview.tierLabel,
        cancellation_policy_snapshot: preview.policySnapshot,
        price_snapshot: preview.priceSnapshot,
      })
      if (eventError) {
        console.error('Cancellation event insert failed:', eventError)
      }
    }

    const customer = booking.customer
    if (customer?.email) {
      const customerName =
        [customer.vorname, customer.nachname].filter(Boolean).join(' ') || 'Kunde'
      const emailContent = buildBookingCancellationEmailContent({
        customerName,
        customerEmail: customer.email,
        booking: updatedBooking as BookingRequest,
        preview,
      })
      await sendBookingCancellationEmails(emailContent)
    }

    return NextResponse.json({
      booking: updatedBooking,
      preview,
    })
  } catch (error: unknown) {
    console.error('Cancellation execute error:', error)
    const message = error instanceof Error ? error.message : 'Storno fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
