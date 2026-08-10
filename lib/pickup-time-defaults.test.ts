import { describe, expect, it } from 'vitest'

import {
  defaultPickupTimeDefaults,
  normalizePickupTimeDefaults,
  resolveDefaultDropOffTime,
  resolveDefaultPickUpTime,
  resolveDefaultPickupTimesForSpan,
} from '@/lib/pickup-time-defaults'

describe('pickup-time-defaults', () => {
  it('normalizes invalid CMS values to code defaults', () => {
    expect(normalizePickupTimeDefaults(null)).toEqual(defaultPickupTimeDefaults)
    expect(
      normalizePickupTimeDefaults({
        weekdayDropOff: 'invalid',
        weekdayPickUp: '17:30',
      })
    ).toEqual({
      ...defaultPickupTimeDefaults,
      weekdayPickUp: '17:30',
    })
  })

  it('uses weekday defaults on regular weekdays', () => {
    const holidays = new Set<string>()
    expect(resolveDefaultDropOffTime('2026-07-27', defaultPickupTimeDefaults, holidays)).toBe(
      '07:00'
    )
    expect(resolveDefaultPickUpTime('2026-07-31', defaultPickupTimeDefaults, holidays)).toBe(
      '17:00'
    )
  })

  it('uses weekend defaults on Saturday and public holidays', () => {
    const holidays = new Set(['2026-08-15'])
    expect(resolveDefaultDropOffTime('2026-07-25', defaultPickupTimeDefaults, holidays)).toBe(
      '09:00'
    )
    expect(resolveDefaultPickUpTime('2026-08-15', defaultPickupTimeDefaults, holidays)).toBe(
      '17:00'
    )
  })

  it('resolves span with first and last care day', () => {
    const holidays = new Set<string>()
    expect(
      resolveDefaultPickupTimesForSpan(
        { start: '2026-07-27', end: '2026-08-01' },
        defaultPickupTimeDefaults,
        holidays
      )
    ).toEqual({ dropOffTime: '07:00', pickUpTime: '17:00' })

    expect(
      resolveDefaultPickupTimesForSpan(
        { start: '2026-07-25', end: '2026-07-26' },
        defaultPickupTimeDefaults,
        holidays
      )
    ).toEqual({ dropOffTime: '09:00', pickUpTime: '17:00' })
  })
})
