import { describe, expect, it } from 'vitest'

import {
  evaluatePickupTimeOnDate,
  isValidTimeHHmm,
  needsOutOfHoursPickupFee,
} from '@/lib/pickup-time-surcharge'

describe('pickup-time-surcharge', () => {
  it('validates HH:mm', () => {
    expect(isValidTimeHHmm('07:30')).toBe(true)
    expect(isValidTimeHHmm('25:00')).toBe(false)
  })

  it('accepts weekday morning window', () => {
    const evalResult = evaluatePickupTimeOnDate('2026-07-27', '07:30', new Set())
    expect(evalResult.withinStandardWindow).toBe(true)
    expect(needsOutOfHoursPickupFee(evalResult)).toBe(false)
  })

  it('midday weekday is note not auto fee', () => {
    const evalResult = evaluatePickupTimeOnDate('2026-07-27', '13:00', new Set())
    expect(evalResult.middayAppointmentNote).toBe(true)
    expect(needsOutOfHoursPickupFee(evalResult)).toBe(false)
  })

  it('weekend outside window triggers fee', () => {
    const evalResult = evaluatePickupTimeOnDate('2026-07-25', '11:00', new Set())
    expect(needsOutOfHoursPickupFee(evalResult)).toBe(true)
  })
})
