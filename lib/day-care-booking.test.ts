import { describe, expect, it } from 'vitest'

import {
  expandBookingOccupiedDates,
  formatSelectedDatesDE,
  minMaxIsoDates,
  validateDayCarePetPayload,
} from '@/lib/day-care-booking'

describe('day-care-booking', () => {
  it('computes min/max from selected dates', () => {
    expect(minMaxIsoDates(['2026-07-31', '2026-07-24', '2026-07-28'])).toEqual({
      start: '2026-07-24',
      end: '2026-07-31',
    })
  })

  it('validates once mode requires dates', () => {
    const result = validateDayCarePetPayload({
      pet_id: 'p1',
      service_type: 'tagesbetreuung',
      day_care_mode: 'once',
      selected_dates: [],
    })
    expect(result.valid).toBe(false)
  })

  it('expands once booking to each selected date', () => {
    const dates = expandBookingOccupiedDates({
      start_date: '2026-07-24',
      end_date: '2026-07-31',
      day_care_mode: 'once',
      selected_dates: ['2026-07-24', '2026-07-28'],
    })
    expect(dates).toEqual(['2026-07-24', '2026-07-28'])
  })

  it('expands recurring booking with 14-day interval', () => {
    const dates = expandBookingOccupiedDates({
      start_date: '2026-09-02',
      end_date: '2026-09-30',
      day_care_mode: 'recurring',
      day_care_weekdays: [3],
      day_care_interval_weeks: 2,
      selected_dates: null,
      cancelled_dates: [],
    })
    expect(dates).toEqual(['2026-09-02', '2026-09-16', '2026-09-30'])
  })

  it('formats selected dates in German', () => {
    expect(formatSelectedDatesDE(['2026-07-24', '2026-07-31'])).toContain('Juli')
  })
})
