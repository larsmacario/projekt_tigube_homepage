import { describe, expect, it } from 'vitest'

import {
  buildBookingInsertRow,
  buildBookingInsertRows,
  parsePortalPetLines,
  validatePortalPetLines,
} from '@/lib/booking-batch-create'

const groupRange = { start_date: '2026-09-11', end_date: '2026-09-14' }
const twoBlocks = [
  { start_date: '2026-09-11', end_date: '2026-09-14' },
  { start_date: '2026-09-20', end_date: '2026-09-22' },
]

describe('booking-batch-create', () => {
  it('parst Portal-Pet-Lines aus API-Request', () => {
    const lines = parsePortalPetLines([
      {
        pet_id: 'pet-a',
        service_type: 'hundepension',
      },
      {
        pet_id: 'pet-b',
        service_type: 'tagesbetreuung',
        day_care_mode: 'once',
        selected_dates: ['2026-09-11'],
      },
    ])

    expect(lines[0].service_type).toBe('hundepension')
    expect(lines[1].day_care_mode).toBe('once')
  })

  it('validiert alle Einzel-Leistungen', () => {
    const cases = [
      {
        lines: [{ pet_id: 'p1', service_type: 'hundepension' as const }],
        blocks: [] as typeof twoBlocks,
        range: groupRange,
        valid: true,
      },
      {
        lines: [{ pet_id: 'p1', service_type: 'katzenbetreuung' as const }],
        blocks: twoBlocks,
        range: null,
        valid: true,
      },
      {
        lines: [
          {
            pet_id: 'p1',
            service_type: 'tagesbetreuung' as const,
            day_care_mode: 'once' as const,
            selected_dates: ['2026-09-11'],
          },
        ],
        blocks: [],
        range: null,
        valid: true,
      },
      {
        lines: [
          {
            pet_id: 'p1',
            service_type: 'tagesbetreuung' as const,
            day_care_mode: 'recurring' as const,
            day_care_weekdays: [1, 5],
            start_date: '2026-09-14',
            end_date: '2026-10-14',
          },
        ],
        blocks: [],
        range: null,
        valid: true,
      },
    ] as const

    for (const { lines, blocks, range, valid } of cases) {
      const result = validatePortalPetLines(lines, blocks, range)
      expect(result.valid).toBe(valid)
    }
  })

  it('erzeugt mehrere Zeilen für Pension mit mehreren Blöcken', () => {
    const rows = buildBookingInsertRows(
      { pet_id: 'pet-a', service_type: 'hundepension' },
      twoBlocks,
      null,
      'cust-1',
      'grp-1',
      null
    )
    expect(rows).toHaveLength(2)
    expect(rows[0].start_date).toBe('2026-09-11')
    expect(rows[1].start_date).toBe('2026-09-20')
  })

  it('persistiert end_date bei recurring', () => {
    const rows = buildBookingInsertRows(
      {
        pet_id: 'pet-a',
        service_type: 'tagesbetreuung',
        day_care_mode: 'recurring',
        day_care_weekdays: [1],
        start_date: '2026-09-14',
        end_date: '2026-10-14',
      },
      [],
      null,
      'cust-1',
      'grp-1',
      null
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].end_date).toBe('2026-10-14')
  })

  it('buildBookingInsertRow bleibt kompatibel für ein Block', () => {
    const row = buildBookingInsertRow(
      { pet_id: 'pet-a', service_type: 'hundepension' },
      groupRange,
      'cust-1',
      'grp-1',
      null
    )
    expect(row.start_date).toBe('2026-09-11')
  })
})
