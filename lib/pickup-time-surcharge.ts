import { parseISO } from 'date-fns'

import { isWeekendIsoDate } from '@/lib/booking-sunday-holiday-surcharge'
import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

export function parseTimeHHmm(value: string): { hours: number; minutes: number } | null {
  const trimmed = value.trim()
  const match = trimmed.match(HHMM_REGEX)
  if (!match) return null
  return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) }
}

export function isValidTimeHHmm(value: string): boolean {
  return parseTimeHHmm(value) != null
}

function minutesSinceMidnight(hours: number, minutes: number): number {
  return hours * 60 + minutes
}

function isWithinHourWindow(
  time: { hours: number; minutes: number },
  startHour: number,
  endHourInclusive: number
): boolean {
  const m = minutesSinceMidnight(time.hours, time.minutes)
  const start = startHour * 60
  const end = endHourInclusive * 60 + 59
  return m >= start && m <= end
}

export function isWeekendOrPublicHoliday(isoDate: string, publicHolidays: Set<string>): boolean {
  return isWeekendIsoDate(isoDate) || publicHolidays.has(isoDate)
}

export type PickupTimeEvaluation = {
  withinStandardWindow: boolean
  middayAppointmentNote: boolean
  earlyArrivalNote: boolean
}

/** Standardfenster laut Kundenportal-CMS (v1). */
export function evaluatePickupTimeOnDate(
  isoDate: string,
  timeHHmm: string,
  publicHolidays: Set<string>
): PickupTimeEvaluation {
  const time = parseTimeHHmm(timeHHmm)
  if (!time) {
    return {
      withinStandardWindow: false,
      middayAppointmentNote: false,
      earlyArrivalNote: false,
    }
  }

  const weekendOrHoliday = isWeekendOrPublicHoliday(isoDate, publicHolidays)
  const weekday = !weekendOrHoliday && !isWeekendIsoDate(isoDate)

  if (weekday) {
    const inMorning = isWithinHourWindow(time, 7, 8)
    const inEvening = isWithinHourWindow(time, 17, 18)
    const inMidday = isWithinHourWindow(time, 12, 14)
    const early = minutesSinceMidnight(time.hours, time.minutes) < 7 * 60

    return {
      withinStandardWindow: inMorning || inEvening,
      middayAppointmentNote: inMidday && !inMorning && !inEvening,
      earlyArrivalNote: early,
    }
  }

  const inMorning = isWithinHourWindow(time, 9, 10)
  const inEvening = isWithinHourWindow(time, 17, 18)
  const early = minutesSinceMidnight(time.hours, time.minutes) < 9 * 60

  return {
    withinStandardWindow: inMorning || inEvening,
    middayAppointmentNote: false,
    earlyArrivalNote: early,
  }
}

export function needsOutOfHoursPickupFee(evaluation: PickupTimeEvaluation): boolean {
  if (evaluation.withinStandardWindow) return false
  if (evaluation.middayAppointmentNote) return false
  return true
}

export const PICKUP_TIME_MIDDAY_NOTE =
  'Bring-/Holzeit zwischen 12 und 14 Uhr unter der Woche nur mit festem Termin – bitte in der Nachricht vermerken.'

export const PICKUP_TIME_EARLY_ARRIVAL_NOTE =
  'Sehr frühe Bringzeiten können eine Anreise am Vortag erfordern (nur für Stammgäste abends möglich) – wir klären das bei der Bestätigung.'

export const DEFAULT_OUT_OF_HOURS_PICKUP_FEE = 8

export const BRING_HOLZEITEN_CATEGORY_ID = 'e5555555-5555-4555-e555-555555555555'
export const OUT_OF_HOURS_PICKUP_PRICE_ID = 'e5555555-5555-4555-a555-555555555551'

export function isBringHolCategory(category: Pick<BookingExtraCategory, 'id' | 'name'>): boolean {
  const name = category.name.toLowerCase()
  return category.id === BRING_HOLZEITEN_CATEGORY_ID || (name.includes('bring') && name.includes('hol'))
}

export function findOutOfHoursPickupCatalogPrice(
  prices: BookingExtraPrice[],
  categories: BookingExtraCategory[]
): BookingExtraPrice | null {
  const bringCategoryIds = new Set(
    categories.filter((c) => isBringHolCategory(c)).map((c) => c.id)
  )

  const byId = prices.find(
    (p) => p.id === OUT_OF_HOURS_PICKUP_PRICE_ID && bringCategoryIds.has(p.category_id)
  )
  if (byId && byId.price_type !== 'text') return byId

  const byUsage = prices.find(
    (p) =>
      bringCategoryIds.has(p.category_id) &&
      p.usage === 'surcharge' &&
      p.price_type !== 'text'
  )
  if (byUsage) return byUsage

  const candidates = prices.filter(
    (p) =>
      bringCategoryIds.has(p.category_id) &&
      p.price_type !== 'text' &&
      (p.name.toLowerCase().includes('außerhalb') ||
        p.name.toLowerCase().includes('ausserhalb') ||
        p.description?.toLowerCase().includes('außerhalb') ||
        p.description?.toLowerCase().includes('termin'))
  )

  return candidates.sort((a, b) => a.sort_order - b.sort_order)[0] ?? null
}

export function resolveOutOfHoursPickupUnitPrice(
  prices: BookingExtraPrice[],
  categories: BookingExtraCategory[]
): number {
  const catalog = findOutOfHoursPickupCatalogPrice(prices, categories)
  const amount = catalog?.final_price ?? catalog?.price
  if (amount != null && !Number.isNaN(amount)) return amount
  return DEFAULT_OUT_OF_HOURS_PICKUP_FEE
}

export function formatTimeDE(timeHHmm: string): string {
  const parsed = parseTimeHHmm(timeHHmm)
  if (!parsed) return timeHHmm
  return `${String(parsed.hours).padStart(2, '0')}:${String(parsed.minutes).padStart(2, '0')}`
}

export function isoDateFromRangeStart(startIso: string): string {
  return startIso
}

export function isoDateFromRangeEnd(endIso: string): string {
  return endIso
}

/** Für Tests: Wochentag aus ISO. */
export function isoWeekday(isoDate: string): number {
  return parseISO(isoDate).getDay()
}
