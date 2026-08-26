import type { BookingLineItem, BookingRequest } from '@/lib/types'
import { iterateIsoDateRange } from '@/lib/booking-availability'
import { expandRecurringDayCareDates } from '@/lib/day-care-interval'
import { sortIsoDates } from '@/lib/day-care-booking'

export function sumLineItemTotals(items: BookingLineItem[]): number {
  return roundMoney(
    items.reduce((sum, item) => sum + (item.line_total ?? 0), 0)
  )
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function getBookingLineItems(
  bookingId: string,
  lineItems: BookingLineItem[]
): BookingLineItem[] {
  return lineItems.filter((item) => item.booking_id === bookingId)
}

export function getBookingFinancialTotal(
  bookingId: string,
  lineItems: BookingLineItem[]
): number {
  return sumLineItemTotals(getBookingLineItems(bookingId, lineItems))
}

export function getActiveBookingDates(
  booking: Pick<
    BookingRequest,
    | 'start_date'
    | 'end_date'
    | 'selected_dates'
    | 'day_care_mode'
    | 'day_care_weekdays'
    | 'day_care_interval_weeks'
    | 'cancelled_dates'
  >,
  options?: { rangeStart?: string; rangeEnd?: string }
): string[] {
  const cancelled = new Set(booking.cancelled_dates ?? [])
  let dates: string[]

  if (booking.selected_dates?.length) {
    dates = sortIsoDates(booking.selected_dates)
  } else if (booking.day_care_mode === 'recurring') {
    dates = expandRecurringDayCareDates(
      booking.start_date,
      booking.end_date,
      booking.day_care_weekdays,
      booking.day_care_interval_weeks
    )
  } else if (booking.end_date) {
    dates = iterateIsoDateRange(booking.start_date, booking.end_date)
  } else {
    dates = [booking.start_date]
  }

  dates = dates.filter((date) => !cancelled.has(date))

  if (options?.rangeStart || options?.rangeEnd) {
    const from = options.rangeStart ?? dates[0]
    const to = options.rangeEnd ?? dates[dates.length - 1]
    if (from && to) {
      dates = dates.filter((date) => date >= from && date <= to)
    }
  }

  return dates
}

export function resolveCancellationCheckInDate(
  booking: Pick<
    BookingRequest,
    | 'start_date'
    | 'end_date'
    | 'selected_dates'
    | 'day_care_mode'
    | 'day_care_weekdays'
    | 'day_care_interval_weeks'
    | 'cancelled_dates'
  >,
  datesToCancel?: string[]
): string {
  if (datesToCancel?.length) {
    return sortIsoDates(datesToCancel)[0]
  }

  const activeDates = getActiveBookingDates(booking)
  return activeDates[0] ?? booking.start_date
}

export function isBookingFullyCancelled(
  booking: Pick<
    BookingRequest,
    | 'start_date'
    | 'end_date'
    | 'selected_dates'
    | 'day_care_mode'
    | 'day_care_weekdays'
    | 'day_care_interval_weeks'
    | 'cancelled_dates'
  >,
  additionalCancelledDates: string[] = []
): boolean {
  // Unbefristete Regeltermine gelten nie als vollständig über den Horizont storniert.
  if (booking.day_care_mode === 'recurring' && !booking.end_date) {
    return false
  }

  const activeDates = getActiveBookingDates(booking)
  const cancelSet = new Set(additionalCancelledDates)
  const remaining = activeDates.filter((date) => !cancelSet.has(date))
  return remaining.length === 0
}
