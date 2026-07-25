import { describe, expect, it } from 'vitest'

import {
  holidayAppliesToRegion,
  mapNagerHolidays,
  filterPublicHolidaysInRange,
  buildPublicHolidayDateSet,
} from '@/lib/public-holidays-de'

describe('public-holidays-de', () => {
  it('filters holidays by region', () => {
    const rows = [
      {
        date: '2026-01-01',
        localName: 'Neujahr',
        name: "New Year's Day",
        counties: null,
        global: true,
      },
      {
        date: '2026-01-06',
        localName: 'Heilige Drei Könige',
        name: 'Epiphany',
        counties: ['DE-BW', 'DE-BY'],
        global: false,
      },
      {
        date: '2026-05-01',
        localName: 'Tag der Arbeit',
        name: 'Labour Day',
        counties: null,
        global: true,
      },
    ]

    expect(holidayAppliesToRegion(rows[1], 'DE-BW')).toBe(true)
    expect(holidayAppliesToRegion(rows[1], 'DE-NW')).toBe(false)

    const bw = mapNagerHolidays(rows, 'DE-BW')
    expect(bw.map((h) => h.date)).toEqual(['2026-01-01', '2026-01-06', '2026-05-01'])

    const nw = mapNagerHolidays(rows, 'DE-NW')
    expect(nw.map((h) => h.date)).toEqual(['2026-01-01', '2026-05-01'])
  })

  it('filters range and builds set', () => {
    const holidays = [
      { date: '2026-07-24', name: 'A' },
      { date: '2026-08-15', name: 'B' },
    ]
    expect(filterPublicHolidaysInRange(holidays, '2026-07-25', '2026-08-01')).toHaveLength(0)
    expect(filterPublicHolidaysInRange(holidays, '2026-07-01', '2026-08-20')).toHaveLength(2)
    expect(buildPublicHolidayDateSet(holidays).has('2026-08-15')).toBe(true)
  })
})
