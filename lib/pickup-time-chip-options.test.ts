import { describe, expect, it } from 'vitest'

import {
  pickupChipOptionsForIsoDate,
  pickupChipOptionsUnionForDates,
  weekdayPickupChipOptions,
  weekendOrHolidayPickupChipOptions,
} from '@/lib/pickup-time-chip-options'

describe('pickup-time-chip-options', () => {
  it('weekday options include morning, midday, evening', () => {
    const opts = weekdayPickupChipOptions()
    expect(opts).toContain('07:00')
    expect(opts).toContain('13:00')
    expect(opts).toContain('18:00')
    expect(opts).not.toContain('09:00')
  })

  it('weekend options include 9-10 and 17-18', () => {
    const opts = weekendOrHolidayPickupChipOptions()
    expect(opts).toContain('09:00')
    expect(opts).toContain('17:00')
    expect(opts).not.toContain('07:00')
  })

  it('monday uses weekday slots', () => {
    const opts = pickupChipOptionsForIsoDate('2026-07-27', new Set())
    expect(opts).toContain('07:00')
    expect(opts).not.toContain('09:00')
  })

  it('saturday uses weekend slots', () => {
    const opts = pickupChipOptionsForIsoDate('2026-07-25', new Set())
    expect(opts).toContain('09:00')
    expect(opts).not.toContain('07:00')
  })

  it('union merges weekday and weekend', () => {
    const union = pickupChipOptionsUnionForDates(
      ['2026-07-27', '2026-07-25'],
      new Set()
    )
    expect(union).toContain('07:00')
    expect(union).toContain('09:00')
    const unique = new Set(union)
    expect(unique.size).toBe(union.length)
  })
})
