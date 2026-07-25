import { unstable_cache } from 'next/cache'

import { iterateIsoDateRange } from '@/lib/booking-availability'

export type PublicHolidayEntry = {
  date: string
  name: string
}

type NagerHoliday = {
  date: string
  localName: string
  name: string
  counties: string[] | null
  global: boolean
}

const NAGER_BASE = 'https://date.nager.at/api/v3/PublicHolidays'

export function getHolidayRegion(): string {
  return process.env.HOLIDAY_REGION?.trim() || 'DE-BW'
}

export function getHolidayCountry(): string {
  return process.env.HOLIDAY_COUNTRY?.trim() || 'DE'
}

/** Feiertag gilt für die Region (z. B. DE-BW). */
export function holidayAppliesToRegion(holiday: NagerHoliday, region: string): boolean {
  if (holiday.global) return true
  if (!holiday.counties || holiday.counties.length === 0) return true
  return holiday.counties.includes(region)
}

export function mapNagerHolidays(
  rows: NagerHoliday[],
  region: string
): PublicHolidayEntry[] {
  return rows
    .filter((h) => holidayAppliesToRegion(h, region))
    .map((h) => ({
      date: h.date,
      name: h.localName || h.name,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchPublicHolidaysForYearUncached(
  year: number,
  country = getHolidayCountry(),
  region = getHolidayRegion()
): Promise<PublicHolidayEntry[]> {
  const response = await fetch(`${NAGER_BASE}/${year}/${country}`, {
    next: { revalidate: 86400 },
  })

  if (!response.ok) {
    throw new Error(`Feiertags-API Fehler (${response.status}) für ${year}`)
  }

  const data = (await response.json()) as NagerHoliday[]
  return mapNagerHolidays(data, region)
}

function yearsForIsoRange(fromIso: string, toIso: string): number[] {
  const startYear = parseInt(fromIso.slice(0, 4), 10)
  const endYear = parseInt(toIso.slice(0, 4), 10)
  const years: number[] = []
  for (let y = startYear; y <= endYear; y++) years.push(y)
  return years
}

async function loadHolidaysForYears(
  years: number[],
  country: string,
  region: string
): Promise<PublicHolidayEntry[]> {
  const byYear = await Promise.all(
    years.map((year) =>
      unstable_cache(
        () => fetchPublicHolidaysForYearUncached(year, country, region),
        ['public-holidays-de', country, region, String(year)],
        { revalidate: 86400 }
      )()
    )
  )

  const merged = new Map<string, PublicHolidayEntry>()
  for (const list of byYear) {
    for (const entry of list) {
      merged.set(entry.date, entry)
    }
  }
  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export async function getPublicHolidaysInRange(
  fromIso: string,
  toIso: string
): Promise<PublicHolidayEntry[]> {
  if (toIso < fromIso) return []

  const country = getHolidayCountry()
  const region = getHolidayRegion()
  const years = yearsForIsoRange(fromIso, toIso)
  const all = await loadHolidaysForYears(years, country, region)

  return all.filter((h) => h.date >= fromIso && h.date <= toIso)
}

export function buildPublicHolidayDateSet(holidays: PublicHolidayEntry[]): Set<string> {
  return new Set(holidays.map((h) => h.date))
}

export function filterPublicHolidaysInRange(
  holidays: PublicHolidayEntry[],
  fromIso: string,
  toIso: string
): PublicHolidayEntry[] {
  return holidays.filter((h) => h.date >= fromIso && h.date <= toIso)
}

/** Alle Feiertage im Range als ISO-Liste (für Schätzung ohne erneuten API-Call). */
export function listHolidayDatesInRange(
  holidaySet: Set<string>,
  fromIso: string,
  toIso: string
): string[] {
  return iterateIsoDateRange(fromIso, toIso).filter((d) => holidaySet.has(d))
}
