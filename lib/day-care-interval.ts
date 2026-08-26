import { parseIsoDate, toIsoDate } from '@/lib/vacation-dates'

/** Planungshorizont für unbefristete Regeltermine (12 Monate). */
export const DAY_CARE_PLANNING_HORIZON_DAYS = 365

export type DayCareIntervalWeeks = 1 | 2

export function isDayCareIntervalWeeks(value: unknown): value is DayCareIntervalWeeks {
  return value === 1 || value === 2
}

export function normalizeDayCareIntervalWeeks(
  value: number | null | undefined
): DayCareIntervalWeeks {
  return value === 2 ? 2 : 1
}

function iterateInclusiveIsoDates(startDate: string, endDate: string): string[] {
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  if (!start || !end || end < start) return []

  const dates: string[] = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(toIsoDate(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

/** ISO-Wochentag 1=Mo … 7=So. */
export function isoWeekdayFromIsoDate(isoDate: string): number {
  const parsed = parseIsoDate(isoDate)
  if (!parsed) return 0
  const js = parsed.getDay()
  return js === 0 ? 7 : js
}

/**
 * Wochenabstand ab Startdatum (Anker): gleiche Kalenderwoche relativ zum Start = 0.
 * Tag T liegt in Woche floor(daysBetween(start, T) / 7).
 */
export function weeksSinceStart(startDate: string, date: string): number {
  const start = parseIsoDate(startDate)
  const current = parseIsoDate(date)
  if (!start || !current || current < start) return -1
  const diffMs = current.getTime() - start.getTime()
  return Math.floor(diffMs / (24 * 60 * 60 * 1000) / 7)
}

export function matchesDayCareInterval(
  startDate: string,
  date: string,
  intervalWeeks: DayCareIntervalWeeks = 1
): boolean {
  const weeks = weeksSinceStart(startDate, date)
  if (weeks < 0) return false
  return weeks % intervalWeeks === 0
}

export function resolveRecurringHorizonEnd(
  startDate: string,
  endDate: string | null | undefined,
  horizonDays = DAY_CARE_PLANNING_HORIZON_DAYS
): string {
  if (endDate) return endDate
  const start = parseIsoDate(startDate)
  if (!start) return startDate
  const end = new Date(start)
  end.setDate(end.getDate() + horizonDays)
  return toIsoDate(end)
}

/**
 * Expandiert feste Tagesbetreuungstage inkl. 1-/2-Wochen-Rhythmus.
 * Ohne Enddatum: Planungshorizont ab Startdatum.
 */
export function expandRecurringDayCareDates(
  startDate: string,
  endDate: string | null | undefined,
  weekdays: number[] | null | undefined,
  intervalWeeks: number | null | undefined = 1,
  horizonDays = DAY_CARE_PLANNING_HORIZON_DAYS
): string[] {
  if (!weekdays?.length) return startDate ? [startDate] : []

  const interval = normalizeDayCareIntervalWeeks(intervalWeeks)
  const rangeEnd = resolveRecurringHorizonEnd(startDate, endDate, horizonDays)
  if (rangeEnd < startDate) return []

  const weekdaySet = new Set(weekdays)
  return iterateInclusiveIsoDates(startDate, rangeEnd).filter((iso) => {
    if (!weekdaySet.has(isoWeekdayFromIsoDate(iso))) return false
    return matchesDayCareInterval(startDate, iso, interval)
  })
}

export function recurringDayCareAppliesOnDate(input: {
  startDate: string
  endDate?: string | null
  weekdays?: number[] | null
  intervalWeeks?: number | null
  cancelledDates?: string[] | null
  date: string
}): boolean {
  const { startDate, endDate, weekdays, date } = input
  if (date < startDate) return false
  if (endDate && date > endDate) return false
  if ((input.cancelledDates ?? []).includes(date)) return false
  if (!weekdays?.length) return date === startDate

  const interval = normalizeDayCareIntervalWeeks(input.intervalWeeks)
  if (!weekdays.includes(isoWeekdayFromIsoDate(date))) return false
  return matchesDayCareInterval(startDate, date, interval)
}

export function filterRecurringDatesInRange(
  dates: string[],
  rangeStart: string,
  rangeEnd: string
): string[] {
  return dates.filter((d) => d >= rangeStart && d <= rangeEnd)
}
