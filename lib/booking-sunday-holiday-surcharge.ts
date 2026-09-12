import { parseISO } from 'date-fns'

import { iterateIsoDateRange } from '@/lib/booking-availability'
import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'
import { FIXED_PERCENTAGE_SURCHARGE_RATE } from '@/lib/price-catalog-policy'

/** Samstag oder Sonntag. */
export function isWeekendIsoDate(isoDate: string): boolean {
  const day = parseISO(isoDate).getDay()
  return day === 0 || day === 6
}

/** Tag mit 50‑%-Zuschlag: Sa, So oder gesetzlicher Feiertag (Wochentag). */
export function isSurchargeCalendarDay(isoDate: string, publicHolidayDates: Set<string>): boolean {
  if (isWeekendIsoDate(isoDate)) return true
  return publicHolidayDates.has(isoDate)
}

export function countWeekendDaysInRange(startIso: string, endIso: string): number {
  return iterateIsoDateRange(startIso, endIso).filter(isWeekendIsoDate).length
}

export type CountSurchargeDaysOptions = {
  /** Abholtag (Enddatum) nicht mitzählen, wenn er Sa/So/Feiertag ist. */
  excludeEndDate?: boolean
}

export function countSurchargeDaysInRange(
  startIso: string,
  endIso: string,
  publicHolidayDates: Set<string>,
  options?: CountSurchargeDaysOptions
): number {
  let dates = iterateIsoDateRange(startIso, endIso)
  if (
    options?.excludeEndDate &&
    endIso &&
    dates.length > 0 &&
    isSurchargeCalendarDay(endIso, publicHolidayDates)
  ) {
    dates = dates.filter((d) => d !== endIso)
  }
  return dates.filter((d) => isSurchargeCalendarDay(d, publicHolidayDates)).length
}

export function countWeekendDaysInList(isoDates: string[]): number {
  return isoDates.filter(isWeekendIsoDate).length
}

export function countSurchargeDaysInList(
  isoDates: string[],
  publicHolidayDates: Set<string>
): number {
  return isoDates.filter((d) => isSurchargeCalendarDay(d, publicHolidayDates)).length
}

export function computeSundayHolidaySurchargeTotal(
  surchargeDayCount: number,
  dailyRate: number,
  percentageRate: number = FIXED_PERCENTAGE_SURCHARGE_RATE
): number | null {
  if (surchargeDayCount <= 0 || dailyRate <= 0) return null
  const perDay = (dailyRate * percentageRate) / 100
  return Math.round(surchargeDayCount * perDay * 100) / 100
}

export const WEEKEND_SURCHARGE_FOOTNOTE =
  'Samstage, Sonntage und gesetzliche Feiertage (Baden-Württemberg) im Zeitraum – der Abholtag zählt nicht. Abweichungen bei der endgültigen Abrechnung bleiben vorbehalten.'

export const DEFAULT_WEEKEND_HOLIDAY_TRAVEL_FEE = 19

export function needsWeekendHolidayTravelFee(
  isoDate: string,
  publicHolidayDates: Set<string>
): boolean {
  return isSurchargeCalendarDay(isoDate, publicHolidayDates)
}

export function listWeekendHolidayTravelDates(
  bringIso: string,
  pickIso: string,
  publicHolidayDates: Set<string>
): string[] {
  const dates: string[] = []
  if (needsWeekendHolidayTravelFee(bringIso, publicHolidayDates)) {
    dates.push(bringIso)
  }
  if (pickIso !== bringIso && needsWeekendHolidayTravelFee(pickIso, publicHolidayDates)) {
    dates.push(pickIso)
  }
  return dates
}

export function findWeekendHolidayTravelCatalogPrice(
  prices: BookingExtraPrice[],
  categories: BookingExtraCategory[]
): BookingExtraPrice | null {
  const candidates = prices.filter(
    (p) =>
      p.usage === 'surcharge' &&
      p.price_type === 'fixed' &&
      (p.name.toLowerCase().includes('an- und abreise') ||
        p.name.toLowerCase().includes('an und abreise'))
  )
  return candidates.sort((a, b) => a.sort_order - b.sort_order)[0] ?? null
}

export function resolveWeekendHolidayTravelUnitPrice(
  prices: BookingExtraPrice[],
  categories: BookingExtraCategory[]
): number {
  const catalog = findWeekendHolidayTravelCatalogPrice(prices, categories)
  const amount = catalog?.final_price ?? catalog?.price
  if (amount != null && !Number.isNaN(amount)) return amount
  return DEFAULT_WEEKEND_HOLIDAY_TRAVEL_FEE
}

export function computeWeekendHolidayTravelTotal(
  bringIso: string,
  pickIso: string,
  publicHolidayDates: Set<string>,
  unitPrice: number
): number {
  const count = listWeekendHolidayTravelDates(bringIso, pickIso, publicHolidayDates).length
  if (count <= 0) return 0
  return Math.round(count * unitPrice * 100) / 100
}
