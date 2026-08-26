import type { BookingRequest } from '@/lib/types'
import { expandBookingOccupiedDates, isRangeService } from '@/lib/day-care-booking'
import { recurringDayCareAppliesOnDate } from '@/lib/day-care-interval'
import { parseTimeHHmm } from '@/lib/pickup-time-surcharge'
import { toIsoDate } from '@/lib/vacation-dates'

export const WEEK_GRID_FIRST_HOUR = 0
export const WEEK_GRID_LAST_HOUR = 24
export const WEEK_TIMED_EVENT_DURATION_MINUTES = 60

export type WeekCalendarEventKind = 'allDay' | 'dropOff' | 'pickUp'

export interface WeekCalendarEvent {
  id: string
  isoDate: string
  kind: WeekCalendarEventKind
  booking: BookingRequest
  startMinutes: number
  endMinutes: number
  label: string
}

export function isoWeekdayFromIsoDate(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const js = date.getDay()
  return js === 0 ? 7 : js
}

export function getMondayOfWeek(reference: Date): Date {
  const date = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date
}

export function getWeekIsoDates(weekMonday: Date): string[] {
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekMonday)
    d.setDate(weekMonday.getDate() + i)
    dates.push(toIsoDate(d))
  }
  return dates
}

export function isBookingActiveOnIsoDate(booking: BookingRequest, isoDate: string): boolean {
  if (booking.service_type === 'tagesbetreuung') {
    if (booking.day_care_mode === 'once' && booking.selected_dates?.length) {
      if ((booking.cancelled_dates ?? []).includes(isoDate)) return false
      return booking.selected_dates.includes(isoDate)
    }
    if (booking.day_care_mode === 'recurring' && booking.day_care_weekdays?.length) {
      return recurringDayCareAppliesOnDate({
        startDate: booking.start_date,
        endDate: booking.end_date,
        weekdays: booking.day_care_weekdays,
        intervalWeeks: booking.day_care_interval_weeks,
        cancelledDates: booking.cancelled_dates,
        date: isoDate,
      })
    }
  }

  const occupied = expandBookingOccupiedDates(booking)
  return occupied.includes(isoDate)
}

function bookingRangeEndIso(booking: BookingRequest): string | null {
  if (booking.end_date) return booking.end_date
  if (booking.selected_dates?.length) {
    return [...booking.selected_dates].sort().at(-1) ?? null
  }
  return null
}

function timedEventMinutes(timeHHmm: string): { startMinutes: number; endMinutes: number } | null {
  const parsed = parseTimeHHmm(timeHHmm)
  if (!parsed) return null
  const startMinutes = parsed.hours * 60 + parsed.minutes
  const endMinutes = startMinutes + WEEK_TIMED_EVENT_DURATION_MINUTES
  return { startMinutes, endMinutes }
}

export function buildWeekCalendarEvents(
  bookings: BookingRequest[],
  weekIsoDates: string[],
  options: { isAdmin?: boolean; getServiceLabel: (serviceType: string) => string }
): WeekCalendarEvent[] {
  const { isAdmin = false, getServiceLabel } = options
  const weekSet = new Set(weekIsoDates)
  const events: WeekCalendarEvent[] = []

  for (const booking of bookings) {
    const petLabel =
      isAdmin && booking.pet?.name ? booking.pet.name : getServiceLabel(booking.service_type)

    for (const isoDate of weekIsoDates) {
      if (!weekSet.has(isoDate)) continue
      if (!isBookingActiveOnIsoDate(booking, isoDate)) continue

      events.push({
        id: `${booking.id}-${isoDate}-allDay`,
        isoDate,
        kind: 'allDay',
        booking,
        startMinutes: WEEK_GRID_FIRST_HOUR * 60,
        endMinutes: WEEK_GRID_LAST_HOUR * 60,
        label: petLabel,
      })
    }

    if (!isRangeService(booking.service_type)) continue

    const group = booking.request_group
    if (!group?.drop_off_time && !group?.pick_up_time) continue

    const rangeEnd = bookingRangeEndIso(booking)

    if (group.drop_off_time && weekSet.has(booking.start_date)) {
      const minutes = timedEventMinutes(group.drop_off_time)
      if (minutes) {
        events.push({
          id: `${booking.id}-${booking.start_date}-dropOff`,
          isoDate: booking.start_date,
          kind: 'dropOff',
          booking,
          startMinutes: minutes.startMinutes,
          endMinutes: minutes.endMinutes,
          label: `Bringen: ${petLabel}`,
        })
      }
    }

    if (group.pick_up_time && rangeEnd && weekSet.has(rangeEnd)) {
      const minutes = timedEventMinutes(group.pick_up_time)
      if (minutes) {
        events.push({
          id: `${booking.id}-${rangeEnd}-pickUp`,
          isoDate: rangeEnd,
          kind: 'pickUp',
          booking,
          startMinutes: minutes.startMinutes,
          endMinutes: minutes.endMinutes,
          label: `Abholen: ${petLabel}`,
        })
      }
    }
  }

  return events
}

export function clampMinutesToGrid(startMinutes: number, endMinutes: number): {
  startMinutes: number
  endMinutes: number
} {
  const gridStart = WEEK_GRID_FIRST_HOUR * 60
  const gridEnd = WEEK_GRID_LAST_HOUR * 60
  const clampedStart = Math.max(gridStart, startMinutes)
  const clampedEnd = Math.min(gridEnd, Math.max(endMinutes, clampedStart + 15))
  return { startMinutes: clampedStart, endMinutes: clampedEnd }
}
