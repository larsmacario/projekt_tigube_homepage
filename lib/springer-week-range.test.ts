import { describe, expect, it } from 'vitest'
import {
  getDefaultSpringerWeekRange,
  iterateWeekDates,
  shiftSpringerWeekRange,
} from '@/lib/springer-week-range'
import { toIsoDate } from '@/lib/vacation-dates'

describe('springer-week-range', () => {
  it('getDefaultSpringerWeekRange returns next Mon-Sun', () => {
    // Wednesday 2026-09-02 → next week 2026-09-07 (Mon) to 2026-09-13 (Sun)
    const range = getDefaultSpringerWeekRange(new Date(2026, 8, 2))
    expect(toIsoDate(range.from)).toBe('2026-09-07')
    expect(toIsoDate(range.to)).toBe('2026-09-13')
  })

  it('getDefaultSpringerWeekRange handles year boundary', () => {
    // Monday 2026-12-28 → next week starts 2027-01-04
    const range = getDefaultSpringerWeekRange(new Date(2026, 11, 28))
    expect(toIsoDate(range.from)).toBe('2027-01-04')
    expect(toIsoDate(range.to)).toBe('2027-01-10')
  })

  it('shiftSpringerWeekRange moves by one week', () => {
    const base = getDefaultSpringerWeekRange(new Date(2026, 8, 2))
    const prev = shiftSpringerWeekRange(base, -1)
    const next = shiftSpringerWeekRange(base, 1)

    expect(toIsoDate(prev.from)).toBe('2026-08-31')
    expect(toIsoDate(prev.to)).toBe('2026-09-06')
    expect(toIsoDate(next.from)).toBe('2026-09-14')
    expect(toIsoDate(next.to)).toBe('2026-09-20')
  })

  it('shiftSpringerWeekRange with delta 0 resets to default (today)', () => {
    const shifted = shiftSpringerWeekRange(
      { from: new Date(2026, 0, 1), to: new Date(2026, 0, 7) },
      0
    )
    const expected = getDefaultSpringerWeekRange()
    expect(toIsoDate(shifted.from)).toBe(toIsoDate(expected.from))
    expect(toIsoDate(shifted.to)).toBe(toIsoDate(expected.to))
  })

  it('iterateWeekDates returns inclusive ISO dates', () => {
    const dates = iterateWeekDates(new Date(2026, 8, 8), new Date(2026, 8, 10))
    expect(dates).toEqual(['2026-09-08', '2026-09-09', '2026-09-10'])
  })
})
