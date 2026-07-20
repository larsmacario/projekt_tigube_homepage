export interface VacationDate {
  id?: string
  period: string
  label: string
  start_date?: string | null
  end_date?: string | null
  sort_order?: number
}

export interface ResolvedVacationBounds {
  start: Date
  end: Date
}

const REFERRED_MESSAGE_PREFIX =
  '[Weitergeleitet an tigube.de – Zeitraum in Betriebsferien]'

export const TIGUBE_URL = 'https://tigube.de'

export function parseVacationPeriod(
  periodStr: string
): ResolvedVacationBounds | null {
  try {
    const cleanStr = periodStr.trim()
    const parts = cleanStr.split(/\s*(?:bis|-)\s*/i)
    if (parts.length !== 2) return null

    const startPart = parts[0].trim()
    const endPart = parts[1].trim()

    const dateRegex = /(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/
    const startMatch = startPart.match(dateRegex)
    const endMatch = endPart.match(dateRegex)

    if (!startMatch || !endMatch) return null

    const endDay = parseInt(endMatch[1], 10)
    const endMonth = parseInt(endMatch[2], 10) - 1
    let endYear = endMatch[3] ? parseInt(endMatch[3], 10) : new Date().getFullYear()
    if (endMatch[3] && endMatch[3].length === 2) endYear += 2000

    const startDay = parseInt(startMatch[1], 10)
    const startMonth = parseInt(startMatch[2], 10) - 1
    let startYear = startMatch[3] ? parseInt(startMatch[3], 10) : endYear
    if (startMatch[3] && startMatch[3].length === 2) startYear += 2000

    const startDate = new Date(startYear, startMonth, startDay, 0, 0, 0, 0)
    const endDate = new Date(endYear, endMonth, endDay, 23, 59, 59, 999)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null
    return { start: startDate, end: endDate }
  } catch {
    return null
  }
}

export function parseIsoDate(dateString: string): Date | null {
  if (!dateString) return null
  const parts = dateString.split('-')
  if (parts.length !== 3) {
    const parsed = new Date(dateString)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  const date = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  )
  return isNaN(date.getTime()) ? null : date
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function resolveVacationBounds(
  vacation: VacationDate
): ResolvedVacationBounds | null {
  if (vacation.start_date && vacation.end_date) {
    const start = parseIsoDate(vacation.start_date)
    const end = parseIsoDate(vacation.end_date)
    if (start && end) {
      return { start: startOfDay(start), end: endOfDay(end) }
    }
  }

  return parseVacationPeriod(vacation.period)
}

export function formatVacationPeriod(start: Date, end: Date): string {
  const startDay = start.getDate()
  const startMonth = String(start.getMonth() + 1).padStart(2, '0')
  const endDay = end.getDate()
  const endMonth = String(end.getMonth() + 1).padStart(2, '0')
  const endYear = end.getFullYear()

  if (start.getFullYear() === end.getFullYear()) {
    return `${startDay}.${startMonth}. bis ${endDay}.${endMonth}.${endYear}`
  }

  const startYear = start.getFullYear()
  return `${startDay}.${startMonth}.${startYear} bis ${endDay}.${endMonth}.${endYear}`
}

export function formatVacationDisplay(vacation: VacationDate): string {
  const bounds = resolveVacationBounds(vacation)
  if (bounds) {
    return formatVacationPeriod(bounds.start, bounds.end)
  }
  return vacation.period
}

export function getFutureVacationPeriods(
  vacations: VacationDate[],
  referenceDate: Date = new Date()
): VacationDate[] {
  const today = startOfDay(referenceDate)

  return vacations
    .map((vacation) => {
      const bounds = resolveVacationBounds(vacation)
      if (!bounds) return null
      return { vacation, bounds }
    })
    .filter(
      (
        item
      ): item is { vacation: VacationDate; bounds: ResolvedVacationBounds } =>
        item !== null && item.bounds.end >= today
    )
    .sort((a, b) => a.bounds.start.getTime() - b.bounds.start.getTime())
    .map(({ vacation, bounds }) => ({
      ...vacation,
      period: formatVacationPeriod(bounds.start, bounds.end),
      start_date: vacation.start_date ?? toIsoDate(bounds.start),
      end_date: vacation.end_date ?? toIsoDate(bounds.end),
    }))
}

export function getCurrentVacationPeriod(
  vacations: VacationDate[],
  referenceDate: Date = new Date()
): VacationDate | null {
  const today = referenceDate

  for (const vacation of vacations) {
    const bounds = resolveVacationBounds(vacation)
    if (bounds && today >= bounds.start && today <= bounds.end) {
      return vacation
    }
  }

  return null
}

export function findOverlappingVacation(
  vacations: VacationDate[],
  from: Date,
  to: Date
): VacationDate | null {
  const rangeStart = startOfDay(from)
  const rangeEnd = endOfDay(to)

  for (const vacation of vacations) {
    const bounds = resolveVacationBounds(vacation)
    if (bounds && rangeStart <= bounds.end && rangeEnd >= bounds.start) {
      return vacation
    }
  }

  return null
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildReferredLeadMessage(message: string): string {
  return `${REFERRED_MESSAGE_PREFIX}\n\n${message}`
}

export function isReferredLeadMessage(message: string | null | undefined): boolean {
  return Boolean(message?.startsWith(REFERRED_MESSAGE_PREFIX))
}
