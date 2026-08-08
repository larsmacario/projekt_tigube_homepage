import { describe, expect, it } from 'vitest'

import { DEFAULT_CANCELLATION_POLICY_CONFIG } from '@/lib/cancellation-policy-config'
import {
  calculateCancellationAmounts,
  daysBeforeCheckIn,
  effectiveCancellationDate,
  findMatchingTier,
} from '@/lib/cancellation-resolver'

describe('cancellation-resolver', () => {
  it('berechnet 0% bei 15+ Tagen Standard', () => {
    const result = calculateCancellationAmounts({
      checkInDate: '2026-09-01',
      bookingStartDate: '2026-09-01',
      bookingEndDate: '2026-09-10',
      cancellationAt: new Date('2026-08-10T10:00:00'),
      bookingTotal: 200,
      policy: DEFAULT_CANCELLATION_POLICY_CONFIG,
      schoolHolidays: [],
    })

    expect(result.ruleSetId).toBe('standard')
    expect(result.chargePercent).toBe(0)
    expect(result.cancellationChargeAmount).toBe(0)
    expect(result.cancellationRefundAmount).toBe(200)
  })

  it('berechnet 50% bei 14-7 Tagen Standard', () => {
    const result = calculateCancellationAmounts({
      checkInDate: '2026-09-01',
      bookingStartDate: '2026-09-01',
      bookingEndDate: '2026-09-10',
      cancellationAt: new Date('2026-08-20T10:00:00'),
      bookingTotal: 200,
      policy: DEFAULT_CANCELLATION_POLICY_CONFIG,
      schoolHolidays: [],
    })

    expect(result.chargePercent).toBe(50)
    expect(result.cancellationChargeAmount).toBe(100)
    expect(result.cancellationRefundAmount).toBe(100)
  })

  it('wendet Schulferien-Regeln bei Überlappung an', () => {
    const result = calculateCancellationAmounts({
      checkInDate: '2026-04-06',
      bookingStartDate: '2026-04-06',
      bookingEndDate: '2026-04-10',
      cancellationAt: new Date('2026-03-01T10:00:00'),
      bookingTotal: 300,
      policy: DEFAULT_CANCELLATION_POLICY_CONFIG,
      schoolHolidays: [{ start: '2026-04-06', end: '2026-04-18', name: 'Osterferien' }],
    })

    expect(result.ruleSetId).toBe('school_holidays_bw')
    expect(result.chargePercent).toBe(50)
    expect(result.cancellationChargeAmount).toBe(150)
  })

  it('berücksichtigt 18-Uhr-Stichtag', () => {
    const beforeCutoff = effectiveCancellationDate(new Date('2026-08-15T17:59:00'), 18)
    const afterCutoff = effectiveCancellationDate(new Date('2026-08-15T18:00:00'), 18)
    expect(beforeCutoff).toBe('2026-08-15')
    expect(afterCutoff).toBe('2026-08-16')
    expect(daysBeforeCheckIn(beforeCutoff, '2026-09-01')).toBe(17)
    expect(daysBeforeCheckIn(afterCutoff, '2026-09-01')).toBe(16)
  })

  it('setzt bei Storno nach Beginn auf höchste Staffel', () => {
    const tier = findMatchingTier(DEFAULT_CANCELLATION_POLICY_CONFIG.ruleSets[0].tiers, -2)
    expect(tier.chargePercent).toBe(100)
  })
})
