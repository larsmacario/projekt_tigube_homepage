import { describe, expect, it } from 'vitest'

import {
  computeSundayHolidaySurchargeTotal,
  computeWeekendHolidayTravelTotal,
  countSurchargeDaysInRange,
  isWeekendIsoDate,
  listWeekendHolidayTravelDates,
} from '@/lib/booking-sunday-holiday-surcharge'

describe('booking-sunday-holiday-surcharge', () => {
  it('detects Sa/So', () => {
    expect(isWeekendIsoDate('2026-07-24')).toBe(false)
    expect(isWeekendIsoDate('2026-07-25')).toBe(true)
    expect(isWeekendIsoDate('2026-07-26')).toBe(true)
  })

  it('counts weekend and weekday holidays in range', () => {
    const holidays = new Set(['2026-07-24'])
    expect(countSurchargeDaysInRange('2026-07-24', '2026-07-26', holidays)).toBe(3)
  })

  it('computes 50% surcharge total', () => {
    expect(computeSundayHolidaySurchargeTotal(2, 40)).toBe(40)
    expect(computeSundayHolidaySurchargeTotal(0, 40)).toBeNull()
  })

  it('excludes pickup day from surcharge count when end date is Sa/So/Feiertag', () => {
    const holidays = new Set<string>()
    expect(countSurchargeDaysInRange('2026-10-01', '2026-10-11', holidays)).toBe(4)
    expect(
      countSurchargeDaysInRange('2026-10-01', '2026-10-11', holidays, { excludeEndDate: true })
    ).toBe(3)
    expect(computeSundayHolidaySurchargeTotal(3, 31)).toBe(46.5)
  })

  it('lists weekend/holiday travel dates for bring and pick', () => {
    const holidays = new Set<string>()
    expect(listWeekendHolidayTravelDates('2026-10-01', '2026-10-11', holidays)).toEqual([
      '2026-10-11',
    ])
    expect(computeWeekendHolidayTravelTotal('2026-10-01', '2026-10-11', holidays, 19)).toBe(19)
  })
})
