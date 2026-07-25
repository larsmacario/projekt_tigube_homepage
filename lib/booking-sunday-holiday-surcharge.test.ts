import { describe, expect, it } from 'vitest'

import {
  computeSundayHolidaySurchargeTotal,
  countSurchargeDaysInRange,
  isWeekendIsoDate,
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
})
