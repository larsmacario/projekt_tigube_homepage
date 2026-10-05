import { getAdminDbClient } from '@/lib/admin-auth'
import {
  validateBookingAvailabilityForDateListServer,
  validateBookingAvailabilityForRange,
} from '@/lib/booking-availability-server'
import { computeCancellationPreview } from '@/lib/cancellation-preview'
import {
  detectScheduleChanged,
  detectTimesChanged,
  loadModificationRequestGroup,
  persistRequestGroupTimes,
  schedulePayloadFromInput,
  timesPayloadFromInput,
  type ModificationRequestGroupContext,
} from '@/lib/booking-modification-appointment'
import {
  bookingHasFutureActiveDays,
  buildBookingUpdateFromModification,
  canModifyBookingStatus,
  diffBookingModification,
  modificationPayloadHasDateIntent,
  type ModificationPayload,
} from '@/lib/booking-modification'
import {
  buildAddedDayLineItems,
  computeLineItemQuantityUpdates,
} from '@/lib/booking-modification-line-items'
import { expandRecurringDayCareDates } from '@/lib/day-care-interval'
import { getPublicHolidaysInRange } from '@/lib/public-holidays-de'
import type { BookingLineItem, BookingRequest, ServiceType } from '@/lib/types'

export function parseModificationPayload(input: {
  start_date?: unknown
  end_date?: unknown
  selected_dates?: unknown
  day_care_weekdays?: unknown
  day_care_interval_weeks?: unknown
  drop_off_time?: unknown
  pick_up_time?: unknown
  day_care_overrides?: unknown
}): ModificationPayload {
  const payload: ModificationPayload = {}
  if (typeof input.start_date === 'string' && input.start_date) {
    payload.start_date = input.start_date
  }
  if (input.end_date === null) {
    payload.end_date = null
  } else if (typeof input.end_date === 'string' && input.end_date) {
    payload.end_date = input.end_date
  }
  if (Array.isArray(input.selected_dates)) {
    payload.selected_dates = input.selected_dates.filter(
      (d): d is string => typeof d === 'string'
    )
  } else if (typeof input.selected_dates === 'string' && input.selected_dates) {
    payload.selected_dates = input.selected_dates
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
  }

  Object.assign(payload, schedulePayloadFromInput(input))
  Object.assign(payload, timesPayloadFromInput(input))

  return payload
}

async function validateAddedAvailability(
  booking: BookingRequest,
  added: string[],
  excludeBookingId: string
): Promise<{ valid: boolean; error?: string }> {
  if (added.length === 0) return { valid: true }

  if (
    booking.service_type === 'tagesbetreuung' &&
    (booking.day_care_mode === 'once' || booking.day_care_mode === 'recurring')
  ) {
    return validateBookingAvailabilityForDateListServer(
      'tagesbetreuung',
      added,
      booking.status === 'approved',
      excludeBookingId
    )
  }

  const sorted = [...added].sort()
  const start = sorted[0]
  const end = sorted[sorted.length - 1]
  return validateBookingAvailabilityForRange({
    serviceType: booking.service_type as ServiceType,
    startDate: start,
    endDate: end,
    excludeBookingId,
    checkCapacity: booking.status === 'approved',
  })
}

export async function buildModificationPreview(input: {
  booking: BookingRequest
  lineItems: BookingLineItem[]
  payload: ModificationPayload
  requestGroup?: ModificationRequestGroupContext | null
  waiveCancellation?: boolean
  cancellationAt?: Date
}) {
  const { booking, lineItems, payload } = input
  const cancellationAt = input.cancellationAt ?? new Date()

  if (!canModifyBookingStatus(booking.status)) {
    throw new Error('Diese Buchung kann nicht angepasst werden.')
  }

  if (!bookingHasFutureActiveDays(booking) && booking.status === 'approved') {
    throw new Error('Abgelaufene Buchungen können nicht mehr angepasst werden.')
  }

  const requestGroup =
    input.requestGroup ??
    (await loadModificationRequestGroup(getAdminDbClient(), booking.request_group_id))

  const timesChanged = detectTimesChanged(requestGroup, payload)
  const scheduleChanged = detectScheduleChanged(booking, payload)

  const dateIntent = modificationPayloadHasDateIntent(payload)
  if (!dateIntent && !timesChanged && !scheduleChanged) {
    throw new Error('Keine Anpassung angegeben.')
  }

  const effectivePayload: ModificationPayload = dateIntent
    ? payload
    : {
        ...payload,
        start_date: booking.start_date,
        end_date: booking.end_date,
        ...(booking.day_care_mode === 'once' && booking.selected_dates?.length
          ? { selected_dates: booking.selected_dates }
          : {}),
        ...(booking.day_care_mode === 'recurring'
          ? {
              day_care_weekdays: booking.day_care_weekdays ?? undefined,
              day_care_interval_weeks:
                (booking.day_care_interval_weeks === 2 ? 2 : 1) as 1 | 2,
            }
          : {}),
      }

  const diff = diffBookingModification(booking, effectivePayload)

  if (diff.unchanged && !timesChanged && !scheduleChanged) {
    return {
      diff,
      availability: { valid: true as const },
      cancellationPreview: null,
      estimatedAddedTotal: 0,
      timesChanged: false,
      scheduleChanged: false,
    }
  }

  if (diff.unchanged && (timesChanged || scheduleChanged)) {
    return {
      diff,
      availability: { valid: true as const },
      cancellationPreview: null,
      estimatedAddedTotal: 0,
      timesChanged,
      scheduleChanged,
    }
  }

  const availability = await validateAddedAvailability(booking, diff.added, booking.id)
  if (!availability.valid) {
    return {
      diff,
      availability,
      cancellationPreview: null,
      estimatedAddedTotal: 0,
      timesChanged,
      scheduleChanged,
    }
  }

  let cancellationPreview = null
  if (booking.status === 'approved' && diff.removed.length > 0) {
    cancellationPreview = await computeCancellationPreview(
      booking,
      lineItems,
      diff.removed,
      cancellationAt,
      { waiveFees: input.waiveCancellation }
    )
  }

  let estimatedAddedTotal = 0
  if (diff.added.length > 0) {
    const sorted = [...diff.added].sort()
    let holidayDates: string[] = []
    try {
      holidayDates = (await getPublicHolidaysInRange(sorted[0], sorted[sorted.length - 1])).map(
        (h) => h.date
      )
    } catch {
      holidayDates = []
    }
    const addedItems = buildAddedDayLineItems({
      booking,
      requestGroupId: booking.request_group_id ?? booking.id,
      addedDates: diff.added,
      lineItems,
      holidayDates,
      createdBy: null,
    })
    estimatedAddedTotal = addedItems.reduce((sum, row) => sum + (row.line_total ?? 0), 0)
  }

  return {
    diff,
    availability,
    cancellationPreview,
    estimatedAddedTotal,
    timesChanged,
    scheduleChanged,
  }
}

export async function loadModificationContextForBooking(booking: BookingRequest) {
  return loadModificationRequestGroup(getAdminDbClient(), booking.request_group_id)
}

export async function applyBookingModification(input: {
  booking: BookingRequest
  lineItems: BookingLineItem[]
  payload: ModificationPayload
  userId: string
  waiveCancellation?: boolean
}) {
  const admin = getAdminDbClient()
  const cancellationAt = new Date()
  const requestGroup = await loadModificationRequestGroup(admin, input.booking.request_group_id)

  const preview = await buildModificationPreview({
    booking: input.booking,
    lineItems: input.lineItems,
    payload: input.payload,
    requestGroup,
    waiveCancellation: input.waiveCancellation,
    cancellationAt,
  })

  if (
    preview.diff.unchanged &&
    !preview.timesChanged &&
    !preview.scheduleChanged
  ) {
    throw new Error('Es wurden keine Änderungen erkannt.')
  }

  if (!preview.availability.valid) {
    throw new Error(preview.availability.error || 'Neue Tage sind nicht verfügbar.')
  }

  const updatePayload = preview.diff.unchanged
    ? { updated_at: cancellationAt.toISOString() }
    : buildBookingUpdateFromModification(preview.diff, input.booking)

  if (
    input.booking.status === 'approved' &&
    preview.diff.removed.length > 0 &&
    preview.cancellationPreview
  ) {
    const prevCharge = input.booking.cancellation_charge_amount ?? 0
    const prevRefund = input.booking.cancellation_refund_amount ?? 0
    updatePayload.cancelled_at = cancellationAt.toISOString()
    updatePayload.cancelled_by = input.userId
    updatePayload.cancellation_charge_amount =
      prevCharge + preview.cancellationPreview.cancellationChargeAmount
    updatePayload.cancellation_refund_amount =
      prevRefund + preview.cancellationPreview.cancellationRefundAmount
    updatePayload.cancellation_policy_snapshot =
      preview.cancellationPreview.policySnapshot
    updatePayload.cancellation_rule_set_id = preview.cancellationPreview.ruleSetId
    updatePayload.cancellation_tier_label = preview.cancellationPreview.tierLabel
    updatePayload.cancellation_financial_status = 'pending'
  }

  let bookingAfter = input.booking

  if (!preview.diff.unchanged || preview.scheduleChanged) {
    const { data: updatedBooking, error: updateError } = await admin
      .from('bookings')
      .update(updatePayload)
      .eq('id', input.booking.id)
      .select(`
      *,
      pet:pets(id, name),
      customer:contacts(id, email, vorname, nachname)
    `)
      .single()

    if (updateError || !updatedBooking) {
      throw updateError ?? new Error('Anpassung konnte nicht gespeichert werden.')
    }

    bookingAfter = updatedBooking as BookingRequest
  } else if (preview.timesChanged) {
    const { error: touchError } = await admin
      .from('bookings')
      .update({ updated_at: cancellationAt.toISOString() })
      .eq('id', input.booking.id)
    if (touchError) throw touchError
  }

  if (
    preview.timesChanged &&
    input.booking.request_group_id
  ) {
    await persistRequestGroupTimes(
      admin,
      input.booking.request_group_id,
      bookingAfter,
      requestGroup,
      input.payload
    )
  } else if (
    !preview.diff.unchanged &&
    input.booking.request_group_id &&
    (input.payload.drop_off_time || input.payload.pick_up_time)
  ) {
    await persistRequestGroupTimes(
      admin,
      input.booking.request_group_id,
      bookingAfter,
      requestGroup,
      input.payload
    )
  }

  if (
    input.booking.status === 'approved' &&
    preview.diff.removed.length > 0 &&
    preview.cancellationPreview
  ) {
    await admin.from('booking_cancellation_events').insert({
      booking_id: input.booking.id,
      customer_id: input.booking.customer_id,
      cancelled_dates: preview.diff.removed,
      booking_total: preview.cancellationPreview.bookingTotal,
      cancellation_charge_amount: preview.cancellationPreview.cancellationChargeAmount,
      cancellation_refund_amount: preview.cancellationPreview.cancellationRefundAmount,
      cancellation_rule_set_id: preview.cancellationPreview.ruleSetId,
      cancellation_tier_label: preview.cancellationPreview.tierLabel,
      cancellation_policy_snapshot: preview.cancellationPreview.policySnapshot,
      price_snapshot: preview.cancellationPreview.priceSnapshot,
    })
  }

  const requestGroupId = input.booking.request_group_id ?? input.booking.id

  if (input.booking.status === 'pending') {
    const qtyUpdates = computeLineItemQuantityUpdates(bookingAfter, input.lineItems)
    for (const row of qtyUpdates) {
      await admin
        .from('booking_line_items')
        .update({
          quantity: row.quantity,
          line_total: row.line_total,
          updated_at: cancellationAt.toISOString(),
        })
        .eq('id', row.id)
    }
  }

  if (preview.diff.added.length > 0) {
    const sorted = [...preview.diff.added].sort()
    let holidayDates: string[] = []
    try {
      holidayDates = (await getPublicHolidaysInRange(sorted[0], sorted[sorted.length - 1])).map(
        (h) => h.date
      )
    } catch {
      holidayDates = []
    }

    const inserts = buildAddedDayLineItems({
      booking: bookingAfter,
      requestGroupId,
      addedDates: preview.diff.added,
      lineItems: input.lineItems,
      holidayDates,
      createdBy: input.userId,
    })

    if (inserts.length > 0) {
      await admin.from('booking_line_items').insert(inserts)
    } else if (input.booking.status === 'pending') {
      const qtyUpdates = computeLineItemQuantityUpdates(bookingAfter, input.lineItems)
      for (const row of qtyUpdates) {
        await admin
          .from('booking_line_items')
          .update({
            quantity: row.quantity,
            line_total: row.line_total,
            updated_at: cancellationAt.toISOString(),
          })
          .eq('id', row.id)
      }
    }
  }

  if (
    bookingAfter.service_type === 'tagesbetreuung' &&
    bookingAfter.day_care_mode === 'recurring'
  ) {
    const expanded = expandRecurringDayCareDates(
      bookingAfter.start_date,
      bookingAfter.end_date,
      bookingAfter.day_care_weekdays,
      bookingAfter.day_care_interval_weeks
    )
    if (expanded.length === 0) {
      await admin
        .from('bookings')
        .update({ status: 'cancelled', updated_at: cancellationAt.toISOString() })
        .eq('id', bookingAfter.id)
    }
  }

  return { booking: bookingAfter, preview }
}
