import { describe, expect, it } from 'vitest'

import {
  getBookingHorizonEndDate,
  getBookingHorizonEndIso,
  isAfterBookingHorizon,
  isWithinBookingHorizon,
} from '@/lib/booking-horizon'

describe('booking-horizon', () => {
  it('ends on Dec 31 of following year', () => {
    expect(getBookingHorizonEndIso(new Date(2026, 9, 5))).toBe('2027-12-31')
    expect(getBookingHorizonEndIso(new Date(2027, 0, 1))).toBe('2028-12-31')
  })

  it('getBookingHorizonEndDate is last day of year', () => {
    const end = getBookingHorizonEndDate(new Date(2026, 5, 1))
    expect(end.getFullYear()).toBe(2027)
    expect(end.getMonth()).toBe(11)
    expect(end.getDate()).toBe(31)
  })

  it('isAfterBookingHorizon', () => {
    expect(isAfterBookingHorizon('2028-01-01', new Date(2026, 9, 5))).toBe(true)
    expect(isWithinBookingHorizon('2027-12-31', new Date(2026, 9, 5))).toBe(true)
    expect(isAfterBookingHorizon('2027-12-31', new Date(2026, 9, 5))).toBe(false)
  })
})
