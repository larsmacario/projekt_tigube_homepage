import { iterateIsoDateRange } from '@/lib/booking-availability'
import { parseIsoDate, toIsoDate } from '@/lib/vacation-dates'

export interface BusyInterval {
  start: string
  end: string
}

const DEFAULT_TIMEZONE = 'Europe/Berlin'

function getDayBoundsInTimeZone(isoDate: string, timeZone: string): { start: Date; end: Date } | null {
  const parsed = parseIsoDate(isoDate)
  if (!parsed) return null

  const y = parsed.getFullYear()
  const m = parsed.getMonth()
  const d = parsed.getDate()

  const probe = new Date(Date.UTC(y, m, d, 12, 0, 0))
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  })
  const parts = formatter.formatToParts(probe)
  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1'
  const match = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
  let offsetMinutes = 60
  if (match) {
    const sign = match[1] === '-' ? -1 : 1
    const hours = Number.parseInt(match[2], 10)
    const mins = match[3] ? Number.parseInt(match[3], 10) : 0
    offsetMinutes = sign * (hours * 60 + mins)
  }

  const startUtcMs = Date.UTC(y, m, d, 0, 0, 0) - offsetMinutes * 60_000
  const endUtcMs = Date.UTC(y, m, d + 1, 0, 0, 0) - offsetMinutes * 60_000
  return { start: new Date(startUtcMs), end: new Date(endUtcMs) }
}

function intervalsOverlap(
  busyStart: Date,
  busyEnd: Date,
  dayStart: Date,
  dayEnd: Date
): boolean {
  return busyStart < dayEnd && busyEnd > dayStart
}

export function busyIntervalsToBlockedIsoDates(
  busyIntervals: BusyInterval[],
  fromDate: string,
  toDate: string,
  timeZone: string = DEFAULT_TIMEZONE
): string[] {
  const blocked = new Set<string>()

  for (const date of iterateIsoDateRange(fromDate, toDate)) {
    const bounds = getDayBoundsInTimeZone(date, timeZone)
    if (!bounds) continue

    for (const interval of busyIntervals) {
      const busyStart = new Date(interval.start)
      const busyEnd = new Date(interval.end)
      if (Number.isNaN(busyStart.getTime()) || Number.isNaN(busyEnd.getTime())) {
        continue
      }
      if (intervalsOverlap(busyStart, busyEnd, bounds.start, bounds.end)) {
        blocked.add(date)
        break
      }
    }
  }

  return [...blocked].sort()
}

export function isoDateRangeEndExclusive(fromDate: string, days: number): string {
  const start = parseIsoDate(fromDate)
  if (!start) return fromDate
  const end = new Date(start)
  end.setDate(end.getDate() + days)
  return toIsoDate(end)
}
