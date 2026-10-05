import { isDateInVacationPeriods } from '@/lib/booking-availability'
import { getBookingHorizonEndIso } from '@/lib/booking-horizon'
import { expandRecurringDayCareDates, isoWeekdayFromIsoDate } from '@/lib/day-care-interval'
import { isValidTimeHHmm } from '@/lib/pickup-time-surcharge'
import type { BookingDateBlock } from '@/lib/booking-date-blocks'

export const BOOKING_APPOINTMENT_PLAN_VERSION = 1 as const

export type PickupTimePair = {
  drop_off: string
  pick_up: string
}

/** Abweichung von Standardzeiten an einem Betreuungstag (Tagesbetreuung). */
export type DayCareTimeOverride = {
  date: string
  drop_off?: string
  pick_up?: string
}

export type VacationBlockPlan = {
  start_date: string
  end_date: string
  drop_off: string
  pick_up: string
}

export type DayCarePlanSection = {
  default_times: PickupTimePair
  /** Nur Abweichungen; fehlende Tage nutzen default_times. */
  overrides?: DayCareTimeOverride[]
  /** Ausgelassene Serientermine (Ferien/Schließtag) – nur Anzeige. */
  skipped_dates?: string[]
}

export type BookingAppointmentPlan = {
  version: typeof BOOKING_APPOINTMENT_PLAN_VERSION
  vacation_blocks?: VacationBlockPlan[]
  day_care?: DayCarePlanSection
}

export type PickupChargeEvent = {
  kind: 'drop_off' | 'pick_up'
  date: string
  time: string
}

export function normalizeTimeOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return isValidTimeHHmm(trimmed) ? trimmed : null
}

export function buildVacationBlockPlans(
  dateBlocks: BookingDateBlock[],
  defaultDropOff: string,
  defaultPickUp: string,
  blockOverrides?: Array<{ blockIndex: number; drop_off?: string; pick_up?: string }>
): VacationBlockPlan[] {
  return dateBlocks.map((block, index) => {
    const override = blockOverrides?.find((o) => o.blockIndex === index)
    return {
      start_date: block.start_date,
      end_date: block.end_date,
      drop_off: normalizeTimeOrNull(override?.drop_off) ?? defaultDropOff,
      pick_up: normalizeTimeOrNull(override?.pick_up) ?? defaultPickUp,
    }
  })
}

export function buildDayCarePlanSection(input: {
  defaultDropOff: string
  defaultPickUp: string
  overrides?: DayCareTimeOverride[]
  skippedDates?: string[]
}): DayCarePlanSection {
  return {
    default_times: {
      drop_off: input.defaultDropOff,
      pick_up: input.defaultPickUp,
    },
    ...(input.overrides?.length ? { overrides: input.overrides } : {}),
    ...(input.skippedDates?.length ? { skipped_dates: [...input.skippedDates].sort() } : {}),
  }
}

export function resolveDayCareTimesForDate(
  section: DayCarePlanSection,
  isoDate: string
): PickupTimePair {
  const override = section.overrides?.find((o) => o.date === isoDate)
  return {
    drop_off: normalizeTimeOrNull(override?.drop_off) ?? section.default_times.drop_off,
    pick_up: normalizeTimeOrNull(override?.pick_up) ?? section.default_times.pick_up,
  }
}

export function pickupEventsFromAppointmentPlan(plan: BookingAppointmentPlan | null | undefined): PickupChargeEvent[] {
  if (!plan || plan.version !== BOOKING_APPOINTMENT_PLAN_VERSION) return []

  const events: PickupChargeEvent[] = []

  for (const block of plan.vacation_blocks ?? []) {
    events.push({ kind: 'drop_off', date: block.start_date, time: block.drop_off })
    events.push({ kind: 'pick_up', date: block.end_date, time: block.pick_up })
  }

  return events
}

export function pickupEventsFromDayCareDates(
  section: DayCarePlanSection,
  dates: string[]
): PickupChargeEvent[] {
  const events: PickupChargeEvent[] = []
  for (const date of dates) {
    const times = resolveDayCareTimesForDate(section, date)
    events.push({ kind: 'drop_off', date, time: times.drop_off })
    events.push({ kind: 'pick_up', date, time: times.pick_up })
  }
  return events
}

export function filterBookableIsoDates(
  dates: string[],
  availability: {
    closedDates: string[]
    vacationPeriods: Array<{ start_date: string; end_date: string }>
  }
): { bookable: string[]; skipped: string[] } {
  const bookable: string[] = []
  const skipped: string[] = []
  for (const date of dates) {
    if (availability.closedDates.includes(date)) {
      skipped.push(date)
      continue
    }
    if (isDateInVacationPeriods(date, availability.vacationPeriods)) {
      skipped.push(date)
      continue
    }
    bookable.push(date)
  }
  return { bookable, skipped }
}

export function expandRecurringDayCareBookableDates(input: {
  startDate: string
  endDate: string | null | undefined
  weekdays: number[]
  intervalWeeks?: 1 | 2
  availability: {
    closedDates: string[]
    vacationPeriods: Array<{ start_date: string; end_date: string }>
  }
  horizonEndIso?: string
}): { bookable: string[]; skipped: string[] } {
  const horizonEnd = input.horizonEndIso ?? getBookingHorizonEndIso()
  const cappedEnd =
    input.endDate && input.endDate < horizonEnd ? input.endDate : horizonEnd

  const expanded = expandRecurringDayCareDates(
    input.startDate,
    cappedEnd,
    input.weekdays,
    input.intervalWeeks ?? 1,
    undefined
  )

  return filterBookableIsoDates(expanded, input.availability)
}

export function weekdaysFromSelectedDates(dates: Date[], toIso: (d: Date) => string): number[] {
  const set = new Set<number>()
  for (const d of dates) {
    set.add(isoWeekdayFromIsoDate(toIso(d)))
  }
  return [...set].sort((a, b) => a - b)
}
