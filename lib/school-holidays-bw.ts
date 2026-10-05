import { unstable_cache } from 'next/cache'

import { SCHOOL_HOLIDAYS_BW_FALLBACK } from '@/lib/school-holidays-bw-fallback'

export { expandRecurringDayCareDates } from '@/lib/day-care-interval'

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

function normalizeHolidayRows(rows: FerienApiHoliday[]): SchoolHolidayPeriod[] {
  return rows
    .map((row) => ({
      start: row.start,
      end: row.end,
      name: row.name,
    }))
    .sort((a, b) => a.start.localeCompare(b.start))
}

export async function fetchSchoolHolidaysBwUncached(): Promise<SchoolHolidayPeriod[]> {
  try {
    const response = await fetch(FERIEN_API_BASE, { next: { revalidate: 86400 } })
    if (!response.ok) {
      throw new Error(`Schulferien-API Fehler (${response.status})`)
    }

    const data = (await response.json()) as FerienApiHoliday[]
    const fromApi = normalizeHolidayRows(Array.isArray(data) ? data : [])
    if (fromApi.length > 0) return fromApi
  } catch (error) {
    console.warn('Schulferien-API nicht verfügbar, Fallback-Daten:', error)
  }

  return [...SCHOOL_HOLIDAYS_BW_FALLBACK]
}

/** Für Storno-Logik: API-Daten, sonst eingebetteter BW-Kalender. */
export async function loadSchoolHolidaysBw(): Promise<SchoolHolidayPeriod[]> {
  return fetchSchoolHolidaysBw()
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
    if (isDateInSchoolHolidaysBw(date, holidays)) return true
  }
  return false
}

export function isDateInSchoolHolidaysBw(
  isoDate: string,
  holidays: SchoolHolidayPeriod[]
): boolean {
  return holidays.some((holiday) => isoDate >= holiday.start && isoDate <= holiday.end)
}

