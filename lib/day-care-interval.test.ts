import { describe, expect, it } from 'vitest'

import {
  expandRecurringDayCareDates,
  matchesDayCareInterval,
  recurringDayCareAppliesOnDate,
  weeksSinceStart,
} from '@/lib/day-care-interval'

describe('day-care-interval', () => {
  it('berechnet Wochenabstand ab Startdatum', () => {
    expect(weeksSinceStart('2026-09-02', '2026-09-02')).toBe(0)
    expect(weeksSinceStart('2026-09-02', '2026-09-09')).toBe(1)
    expect(weeksSinceStart('2026-09-02', '2026-09-16')).toBe(2)
  })

  it('matcht wöchentlichen Rhythmus', () => {
    expect(matchesDayCareInterval('2026-09-02', '2026-09-09', 1)).toBe(true)
    expect(matchesDayCareInterval('2026-09-02', '2026-09-16', 1)).toBe(true)
  })

  it('matcht 14-Tage-Rhythmus nur jede zweite Woche', () => {
    expect(matchesDayCareInterval('2026-09-02', '2026-09-02', 2)).toBe(true)
    expect(matchesDayCareInterval('2026-09-02', '2026-09-09', 2)).toBe(false)
    expect(matchesDayCareInterval('2026-09-02', '2026-09-16', 2)).toBe(true)
  })

  it('expandiert Mi wöchentlich ab Start', () => {
    // 2026-09-02 = Mittwoch
    const dates = expandRecurringDayCareDates(
      '2026-09-02',
      '2026-09-30',
      [3],
      1
    )
    expect(dates).toEqual([
      '2026-09-02',
      '2026-09-09',
      '2026-09-16',
      '2026-09-23',
      '2026-09-30',
    ])
  })

  it('expandiert Mi alle 14 Tage ab Start', () => {
    const dates = expandRecurringDayCareDates(
      '2026-09-02',
      '2026-09-30',
      [3],
      2
    )
    expect(dates).toEqual(['2026-09-02', '2026-09-16', '2026-09-30'])
  })

  it('berücksichtigt cancelled_dates', () => {
    expect(
      recurringDayCareAppliesOnDate({
        startDate: '2026-09-02',
        weekdays: [3],
        intervalWeeks: 1,
        cancelledDates: ['2026-09-09'],
        date: '2026-09-09',
      })
    ).toBe(false)
    expect(
      recurringDayCareAppliesOnDate({
        startDate: '2026-09-02',
        weekdays: [3],
        intervalWeeks: 1,
        cancelledDates: ['2026-09-09'],
        date: '2026-09-16',
      })
    ).toBe(true)
  })

  it('behandelt fehlendes Interval als wöchentlich', () => {
    const dates = expandRecurringDayCareDates('2026-09-02', '2026-09-16', [3], null)
    expect(dates).toEqual(['2026-09-02', '2026-09-09', '2026-09-16'])
  })
})
