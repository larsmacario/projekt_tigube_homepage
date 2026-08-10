import { isWeekendOrPublicHoliday } from '@/lib/pickup-time-surcharge'
import { isValidTimeHHmm } from '@/lib/pickup-time-surcharge'

export interface PickupTimeDefaults {
  weekdayDropOff: string
  weekdayPickUp: string
  weekendDropOff: string
  weekendPickUp: string
}

export const defaultPickupTimeDefaults: PickupTimeDefaults = {
  weekdayDropOff: '07:00',
  weekdayPickUp: '17:00',
  weekendDropOff: '09:00',
  weekendPickUp: '17:00',
}

function normalizeTimeField(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return isValidTimeHHmm(trimmed) ? trimmed : fallback
}

export function normalizePickupTimeDefaults(input: unknown): PickupTimeDefaults {
  const d = defaultPickupTimeDefaults
  if (!input || typeof input !== 'object') return d
  const raw = input as Record<string, unknown>
  return {
    weekdayDropOff: normalizeTimeField(raw.weekdayDropOff, d.weekdayDropOff),
    weekdayPickUp: normalizeTimeField(raw.weekdayPickUp, d.weekdayPickUp),
    weekendDropOff: normalizeTimeField(raw.weekendDropOff, d.weekendDropOff),
    weekendPickUp: normalizeTimeField(raw.weekendPickUp, d.weekendPickUp),
  }
}

export function isWeekendOrHolidayDate(isoDate: string, publicHolidays: Set<string>): boolean {
  return isWeekendOrPublicHoliday(isoDate, publicHolidays)
}

export function resolveDefaultDropOffTime(
  isoDate: string,
  defaults: PickupTimeDefaults,
  publicHolidays: Set<string>
): string {
  return isWeekendOrHolidayDate(isoDate, publicHolidays)
    ? defaults.weekendDropOff
    : defaults.weekdayDropOff
}

export function resolveDefaultPickUpTime(
  isoDate: string,
  defaults: PickupTimeDefaults,
  publicHolidays: Set<string>
): string {
  return isWeekendOrHolidayDate(isoDate, publicHolidays)
    ? defaults.weekendPickUp
    : defaults.weekdayPickUp
}

export function resolveDefaultPickupTimesForSpan(
  span: { start: string; end: string },
  defaults: PickupTimeDefaults,
  publicHolidays: Set<string>
): { dropOffTime: string; pickUpTime: string } {
  return {
    dropOffTime: resolveDefaultDropOffTime(span.start, defaults, publicHolidays),
    pickUpTime: resolveDefaultPickUpTime(span.end, defaults, publicHolidays),
  }
}
