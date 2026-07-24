import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import type { BookingRequest, ServiceType, DayCareMode } from '@/lib/types'
import { iterateIsoDateRange } from '@/lib/booking-availability'

export const DAY_CARE_WEEKDAY_OPTIONS: Array<{ iso: number; label: string }> = [
  { iso: 1, label: 'Mo' },
  { iso: 2, label: 'Di' },
  { iso: 3, label: 'Mi' },
  { iso: 4, label: 'Do' },
  { iso: 5, label: 'Fr' },
  { iso: 6, label: 'Sa' },
  { iso: 7, label: 'So' },
]

export function dayCareModeLabel(mode: DayCareMode | null | undefined): string {
  if (mode === 'once') return 'Einmalig'
  if (mode === 'recurring') return 'Feste Wochentage'
  return ''
}

export function formatWeekdayList(weekdays: number[] | null | undefined): string {
  if (!weekdays?.length) return ''
  const labels = DAY_CARE_WEEKDAY_OPTIONS.filter((d) => weekdays.includes(d.iso)).map(
    (d) => d.label
  )
  return labels.join(', ')
}

export function sortIsoDates(dates: string[]): string[] {
  return [...dates].sort()
}

export function minMaxIsoDates(dates: string[]): { start: string; end: string } | null {
  const sorted = sortIsoDates(dates)
  if (sorted.length === 0) return null
  return { start: sorted[0], end: sorted[sorted.length - 1] }
}

export function formatSelectedDatesDE(dates: string[]): string {
  const sorted = sortIsoDates(dates)
  if (sorted.length === 0) return ''
  if (sorted.length === 1) {
    return format(parseISO(sorted[0]), 'd. MMMM yyyy', { locale: de })
  }

  const sameMonth = sorted.every(
    (d) => d.slice(0, 7) === sorted[0].slice(0, 7) && d.slice(0, 4) === sorted[0].slice(0, 4)
  )

  if (sameMonth) {
    const parts = sorted.map((d) => format(parseISO(d), 'd.', { locale: de }))
    const monthYear = format(parseISO(sorted[0]), 'MMMM yyyy', { locale: de })
    if (parts.length === 2) {
      return `${parts[0]} und ${parts[1]} ${monthYear}`
    }
    return `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]} ${monthYear}`
  }

  return sorted.map((d) => format(parseISO(d), 'd. MMM yyyy', { locale: de })).join(', ')
}

export function formatDayCareBookingSummary(booking: Pick<
  BookingRequest,
  | 'service_type'
  | 'day_care_mode'
  | 'day_care_weekdays'
  | 'selected_dates'
  | 'start_date'
  | 'end_date'
>): string | null {
  if (booking.service_type !== 'tagesbetreuung' || !booking.day_care_mode) {
    return null
  }

  if (booking.day_care_mode === 'once' && booking.selected_dates?.length) {
    return `Einmalig: ${formatSelectedDatesDE(booking.selected_dates)}`
  }

  if (booking.day_care_mode === 'recurring') {
    const days = formatWeekdayList(booking.day_care_weekdays)
    const start = format(parseISO(booking.start_date), 'd. MMMM yyyy', { locale: de })
    return `Feste Tage: ${days} ab ${start}`
  }

  return null
}

export interface DayCarePetPayload {
  pet_id: string
  service_type: ServiceType
  day_care_mode?: DayCareMode
  day_care_weekdays?: number[]
  selected_dates?: string[]
  start_date?: string
  end_date?: string | null
}

export function validateDayCarePetPayload(
  line: DayCarePetPayload
): { valid: true } | { valid: false; error: string } {
  if (line.service_type !== 'tagesbetreuung') {
    return { valid: true }
  }

  if (!line.day_care_mode) {
    return { valid: false, error: 'Bitte wähle einmalig oder feste Wochentage für die Tagesbetreuung.' }
  }

  if (line.day_care_mode === 'once') {
    if (!line.selected_dates?.length) {
      return { valid: false, error: 'Bitte wähle mindestens einen Betreuungstag.' }
    }
    return { valid: true }
  }

  if (!line.day_care_weekdays?.length) {
    return { valid: false, error: 'Bitte wähle mindestens einen Wochentag.' }
  }

  if (!line.start_date) {
    return { valid: false, error: 'Bitte wähle ein Startdatum für die festen Tage.' }
  }

  const invalidWeekday = line.day_care_weekdays.some((d) => d < 1 || d > 7)
  if (invalidWeekday) {
    return { valid: false, error: 'Ungültige Wochentage.' }
  }

  return { valid: true }
}

export function isRangeService(serviceType: ServiceType): boolean {
  return serviceType === 'hundepension' || serviceType === 'katzenbetreuung'
}

export function expandBookingOccupiedDates(
  booking: Pick<
    BookingRequest,
    'start_date' | 'end_date' | 'selected_dates' | 'day_care_mode'
  >
): string[] {
  if (booking.selected_dates?.length) {
    return sortIsoDates(booking.selected_dates)
  }
  if (booking.day_care_mode === 'recurring' && booking.end_date === null) {
    return [booking.start_date]
  }
  if (!booking.end_date) {
    return [booking.start_date]
  }
  return iterateIsoDateRange(booking.start_date, booking.end_date)
}
