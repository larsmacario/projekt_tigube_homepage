import { unstable_cache } from 'next/cache'

import { iterateIsoDateRange } from '@/lib/booking-availability'
import { startOfDay, toIsoDate } from '@/lib/vacation-dates'

export type SchoolHolidayPeriod = {
  start: string
  end: string
  name: string
}

type FerienApiHoliday = {
  start: string
  end: string
  name: string
  stateCode?: string
}

const FERIEN_API_BASE = 'https://ferien-api.de/api/v1/holidays/DE-BW'

export async function fetchSchoolHolidaysBwUncached(): Promise<SchoolHolidayPeriod[]> {
  const response = await fetch(FERIEN_API_BASE, { next: { revalidate: 86400 } })
  if (!response.ok) {
    throw new Error(`Schulferien-API Fehler (${response.status})`)
  }

  const data = (await response.json()) as FerienApiHoliday[]
  return data
    .map((row) => ({
      start: row.start,
      end: row.end,
      name: row.name,
    }))
    .sort((a, b) => a.start.localeCompare(b.start))
}

export const fetchSchoolHolidaysBw = unstable_cache(
  fetchSchoolHolidaysBwUncached,
  ['school-holidays-bw'],
  { revalidate: 86400 }
)

export function periodsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA <= endB && endA >= startB
}

export function bookingOverlapsSchoolHolidaysBw(
  startDate: string,
  endDate: string | null,
  holidays: SchoolHolidayPeriod[]
): boolean {
  const bookingEnd = endDate ?? startDate
  return holidays.some((holiday) =>
    periodsOverlap(startDate, bookingEnd, holiday.start, holiday.end)
  )
}

export function datesOverlapSchoolHolidaysBw(
  dates: string[],
  holidays: SchoolHolidayPeriod[]
): boolean {
  if (dates.length === 0) return false
  for (const date of dates) {
    if (holidays.some((holiday) => date >= holiday.start && date <= holiday.end)) {
      return true
    }
  }
  return false
}

export function expandRecurringDayCareDates(
  startDate: string,
  endDate: string | null,
  weekdays: number[] | null,
  horizonDays = 365
): string[] {
  if (!weekdays?.length) return [startDate]

  const start = startOfDay(new Date(startDate))
  const end = endDate
    ? startOfDay(new Date(endDate))
    : startOfDay(new Date(start.getTime() + horizonDays * 24 * 60 * 60 * 1000))

  const fromIso = toIsoDate(start)
  const toIso = toIsoDate(end)
  const weekdaySet = new Set(weekdays)

  return iterateIsoDateRange(fromIso, toIso).filter((iso) => {
    const day = startOfDay(new Date(iso)).getDay()
    const isoWeekday = day === 0 ? 7 : day
    return weekdaySet.has(isoWeekday)
  })
}
