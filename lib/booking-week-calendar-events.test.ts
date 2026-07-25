import { describe, expect, it } from 'vitest'
import type { BookingRequest } from '@/lib/types'
import {
  buildWeekCalendarEvents,
  getMondayOfWeek,
  getWeekIsoDates,
  isBookingActiveOnIsoDate,
} from '@/lib/booking-week-calendar-events'

function baseBooking(overrides: Partial<BookingRequest>): BookingRequest {
  return {
    id: 'b1',
    customer_id: 'c1',
    pet_id: 'p1',
    service_type: 'hundepension',
    start_date: '2026-07-06',
    end_date: '2026-07-10',
    day_care_mode: null,
    day_care_weekdays: null,
    selected_dates: null,
    message: null,
    status: 'approved',
    admin_notes: null,
    responded_at: null,
    responded_by: null,
    request_group_id: 'g1',
    created_at: '',
    updated_at: '',
    pet: { id: 'p1', name: 'Bello' } as BookingRequest['pet'],
    request_group: {
      id: 'g1',
      customer_id: 'c1',
      drop_off_time: '08:30',
      pick_up_time: '17:00',
      created_at: '',
    },
    ...overrides,
  }
}

describe('booking-week-calendar-events', () => {
  const week = getWeekIsoDates(getMondayOfWeek(new Date(2026, 6, 8)))
  const getServiceLabel = () => 'Service'

  it('marks each day in range as active', () => {
    const booking = baseBooking({})
    expect(isBookingActiveOnIsoDate(booking, '2026-07-06')).toBe(true)
    expect(isBookingActiveOnIsoDate(booking, '2026-07-08')).toBe(true)
    expect(isBookingActiveOnIsoDate(booking, '2026-07-05')).toBe(false)
  })

  it('creates all-day plus bring and pickup timed events', () => {
    const events = buildWeekCalendarEvents([baseBooking({})], week, {
      isAdmin: true,
      getServiceLabel,
    })
    const allDay = events.filter((e) => e.kind === 'allDay')
    expect(allDay.length).toBe(5)
    expect(events.some((e) => e.kind === 'dropOff' && e.isoDate === '2026-07-06')).toBe(true)
    expect(events.some((e) => e.kind === 'pickUp' && e.isoDate === '2026-07-10')).toBe(true)
  })

  it('handles day care once on selected dates', () => {
    const booking = baseBooking({
      id: 'dc1',
      service_type: 'tagesbetreuung',
      day_care_mode: 'once',
      selected_dates: ['2026-07-07', '2026-07-09'],
      start_date: '2026-07-07',
      end_date: '2026-07-09',
      request_group: null,
    })
    const events = buildWeekCalendarEvents([booking], week, { getServiceLabel })
    expect(events.filter((e) => e.kind === 'allDay').map((e) => e.isoDate).sort()).toEqual([
      '2026-07-07',
      '2026-07-09',
    ])
  })
})
