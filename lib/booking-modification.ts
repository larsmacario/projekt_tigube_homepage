import { iterateIsoDateRange } from '@/lib/booking-availability'
import { getActiveBookingDates } from '@/lib/cancellation-booking-total'
import { expandRecurringDayCareDates } from '@/lib/day-care-interval'
import { sortIsoDates } from '@/lib/day-care-booking'
import { isAfterBookingHorizon } from '@/lib/booking-horizon'
import { startOfDay, toIsoDate } from '@/lib/vacation-dates'
import type { BookingRequest, BookingStatus } from '@/lib/types'

import type { DayCareTimeOverride } from '@/lib/booking-appointment-plan'
import { normalizeDayCareIntervalWeeks } from '@/lib/day-care-interval'

export type ModificationPayload = {
  start_date?: string
  end_date?: string | null
  selected_dates?: string[]
  day_care_weekdays?: number[]
  day_care_interval_weeks?: 1 | 2
  drop_off_time?: string
  pick_up_time?: string
  day_care_overrides?: DayCareTimeOverride[]
}

export type ModificationNextFields = {
  start_date: string
  end_date: string | null
  selected_dates: string[] | null
  cancelled_dates: string[]
  day_care_weekdays?: number[]
  day_care_interval_weeks?: 1 | 2
}

export type ModificationDiff = {
  removed: string[]
  added: string[]
  unchanged: boolean
  nextFields: ModificationNextFields
  targetActiveDates: string[]
  currentActiveDates: string[]
}

const MODIFIABLE: BookingStatus[] = ['pending', 'approved']

export function canModifyBookingStatus(status: BookingStatus): boolean {
  return MODIFIABLE.includes(status)
}

export function bookingHasFutureActiveDays(
  booking: Pick<
    BookingRequest,
    | 'start_date'
    | 'end_date'
    | 'selected_dates'
    | 'day_care_mode'
    | 'day_care_weekdays'
    | 'day_care_interval_weeks'
    | 'cancelled_dates'
  >,
  reference = new Date()
): boolean {
  const today = toIsoDate(startOfDay(reference))
  const active = getActiveBookingDates(booking)
  return active.some((d) => d >= today)
}

export function expandActiveDatesFromFields(
  booking: Pick<
    BookingRequest,
    | 'service_type'
    | 'start_date'
    | 'end_date'
    | 'selected_dates'
    | 'day_care_mode'
    | 'day_care_weekdays'
    | 'day_care_interval_weeks'
    | 'cancelled_dates'
  >,
  fields: Pick<
    ModificationNextFields,
    'start_date' | 'end_date' | 'selected_dates' | 'day_care_weekdays' | 'day_care_interval_weeks'
  >,
  includeCancelledFilter = true
): string[] {
  const cancelled = includeCancelledFilter
    ? new Set(booking.cancelled_dates ?? [])
    : new Set<string>()

  let dates: string[]

  if (
    booking.service_type === 'tagesbetreuung' &&
    booking.day_care_mode === 'once' &&
    fields.selected_dates?.length
  ) {
    dates = sortIsoDates(fields.selected_dates)
  } else if (
    booking.service_type === 'tagesbetreuung' &&
    booking.day_care_mode === 'recurring'
  ) {
    const weekdays = fields.day_care_weekdays?.length
      ? fields.day_care_weekdays
      : booking.day_care_weekdays ?? []
    const intervalWeeks = normalizeDayCareIntervalWeeks(
      fields.day_care_interval_weeks ?? booking.day_care_interval_weeks
    )
    dates = expandRecurringDayCareDates(
      fields.start_date,
      fields.end_date,
      weekdays,
      intervalWeeks
    )
  } else if (fields.end_date) {
    dates = iterateIsoDateRange(fields.start_date, fields.end_date)
  } else {
    dates = [fields.start_date]
  }

  return dates.filter((d) => !cancelled.has(d))
}

export function resolveTargetFields(
  booking: BookingRequest,
  payload: ModificationPayload
): ModificationNextFields {
  if (
    booking.service_type === 'tagesbetreuung' &&
    booking.day_care_mode === 'once'
  ) {
    const selected = sortIsoDates(payload.selected_dates ?? [])
    if (selected.length === 0) {
      throw new Error('Bitte mindestens einen Betreuungstag wählen.')
    }
    return {
      start_date: selected[0],
      end_date: selected[selected.length - 1],
      selected_dates: selected,
      cancelled_dates: [],
    }
  }

  if (
    booking.service_type === 'tagesbetreuung' &&
    booking.day_care_mode === 'recurring'
  ) {
    const start = payload.start_date ?? booking.start_date
    const end =
      payload.end_date !== undefined ? payload.end_date : booking.end_date
    if (!start) {
      throw new Error('Startdatum fehlt.')
    }
    if (end && end < start) {
      throw new Error('Das Enddatum liegt vor dem Startdatum.')
    }
    const weekdays = payload.day_care_weekdays?.length
      ? [...payload.day_care_weekdays].sort((a, b) => a - b)
      : [...(booking.day_care_weekdays ?? [])].sort((a, b) => a - b)
    if (weekdays.length === 0) {
      throw new Error('Bitte mindestens einen Wochentag wählen.')
    }
    const intervalWeeks = normalizeDayCareIntervalWeeks(
      payload.day_care_interval_weeks ?? booking.day_care_interval_weeks
    )
    const expanded = expandRecurringDayCareDates(start, end, weekdays, intervalWeeks)
    return {
      start_date: start,
      end_date: end ?? null,
      selected_dates: null,
      cancelled_dates: (booking.cancelled_dates ?? []).filter((d) => expanded.includes(d)),
      day_care_weekdays: weekdays,
      day_care_interval_weeks: intervalWeeks,
    }
  }

  const start = payload.start_date ?? booking.start_date
  const end =
    payload.end_date !== undefined && payload.end_date !== null
      ? payload.end_date
      : payload.end_date === null
        ? null
        : booking.end_date ?? booking.start_date

  if (!start) {
    throw new Error('Startdatum fehlt.')
  }
  const effectiveEnd = end ?? start
  if (effectiveEnd < start) {
    throw new Error('Das Enddatum liegt vor dem Startdatum.')
  }

  return {
    start_date: start,
    end_date: effectiveEnd,
    selected_dates: null,
    cancelled_dates: booking.status === 'pending' ? [] : booking.cancelled_dates ?? [],
  }
}

export function diffBookingModification(
  booking: BookingRequest,
  payload: ModificationPayload
): ModificationDiff {
  const nextFields = resolveTargetFields(booking, payload)
  const currentActiveDates = getActiveBookingDates(booking)
  const targetActiveDates = expandActiveDatesFromFields(booking, nextFields, false)

  if (targetActiveDates.length === 0) {
    throw new Error('Der gewählte Zeitraum enthält keine Betreuungstage.')
  }

  for (const d of targetActiveDates) {
    if (isAfterBookingHorizon(d)) {
      throw new Error('Mindestens ein Tag liegt außerhalb des Buchungshorizonts.')
    }
  }

  const currentSet = new Set(currentActiveDates)
  const targetSet = new Set(targetActiveDates)
  const removed = currentActiveDates.filter((d) => !targetSet.has(d))
  const added = targetActiveDates.filter((d) => !currentSet.has(d))

  if (booking.status === 'pending') {
    nextFields.cancelled_dates = []
  } else {
    nextFields.cancelled_dates = (nextFields.cancelled_dates ?? []).filter((d) =>
      targetSet.has(d)
    )
  }

  return {
    removed,
    added,
    unchanged: removed.length === 0 && added.length === 0,
    nextFields,
    targetActiveDates,
    currentActiveDates,
  }
}

export function buildBookingUpdateFromModification(
  diff: ModificationDiff,
  booking: BookingRequest
): Record<string, unknown> {
  const { nextFields } = diff
  const update: Record<string, unknown> = {
    start_date: nextFields.start_date,
    end_date: nextFields.end_date,
    selected_dates: nextFields.selected_dates,
    cancelled_dates: nextFields.cancelled_dates,
    updated_at: new Date().toISOString(),
  }
  if (
    booking.service_type === 'tagesbetreuung' &&
    booking.day_care_mode === 'recurring' &&
    nextFields.day_care_weekdays?.length
  ) {
    update.day_care_weekdays = nextFields.day_care_weekdays
    update.day_care_interval_weeks = nextFields.day_care_interval_weeks ?? 1
  }
  return update
}

export function modificationPayloadHasDateIntent(payload: ModificationPayload): boolean {
  if (payload.start_date) return true
  if (payload.end_date !== undefined) return true
  if (payload.selected_dates?.length) return true
  if (payload.day_care_weekdays?.length) return true
  if (payload.day_care_interval_weeks != null) return true
  return false
}

export function isModificationFullyCancelled(
  booking: BookingRequest,
  diff: ModificationDiff
): boolean {
  return diff.targetActiveDates.length === 0
}
