import { parseISO } from 'date-fns'

import { iterateIsoDateRange } from '@/lib/booking-availability'
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

export function countSurchargeDaysInRange(
  startIso: string,
  endIso: string,
  publicHolidayDates: Set<string>
): number {
  return iterateIsoDateRange(startIso, endIso).filter((d) =>
    isSurchargeCalendarDay(d, publicHolidayDates)
  ).length
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
  'Samstage, Sonntage und gesetzliche Feiertage (Baden-Württemberg) im Zeitraum. Abweichungen bei der endgültigen Abrechnung bleiben vorbehalten.'
