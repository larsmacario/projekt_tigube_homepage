import { describe, expect, it } from 'vitest'

import { parseVacationPeriod, parseIsoDate, toIsoDate } from '@/lib/vacation-dates'
import { getVacationPeriodsInRange } from '@/lib/booking-availability'

describe('parseVacationPeriod', () => {
  it('parst 26.11.-06.12.2027 auf den 26.11.', () => {
    const bounds = parseVacationPeriod('26.11.-06.12.2027')
    expect(bounds).not.toBeNull()
    expect(toIsoDate(bounds!.start)).toBe('2027-11-26')
    expect(toIsoDate(bounds!.end)).toBe('2027-12-06')
  })

  it('parst 27.11. bis 07.12.2026 auf den 27.11.', () => {
    const bounds = parseVacationPeriod('27.11. bis 07.12.2026')
    expect(bounds).not.toBeNull()
    expect(toIsoDate(bounds!.start)).toBe('2026-11-27')
    expect(toIsoDate(bounds!.end)).toBe('2026-12-07')
  })
})

describe('parseIsoDate', () => {
  it('ignoriert Uhrzeit und nutzt nur das Kalenderdatum', () => {
    const date = parseIsoDate('2027-11-26T23:00:00.000Z')
    expect(date).not.toBeNull()
    expect(toIsoDate(date!)).toBe('2027-11-26')
  })
})

describe('getVacationPeriodsInRange', () => {
  it('markiert den Starttag der Newsbar-Periode', () => {
    const periods = getVacationPeriodsInRange(
      [{ period: '26.11.-06.12.2027', label: 'geschlossen' }],
      '2027-11-01',
      '2027-12-31'
    )
    expect(periods[0]?.start_date).toBe('2027-11-26')
    expect(periods[0]?.end_date).toBe('2027-12-06')
  })
})
