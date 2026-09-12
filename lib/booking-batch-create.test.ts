import { describe, expect, it } from 'vitest'

import {
  buildBookingInsertRow,
  parsePortalPetLines,
  validatePortalPetLines,
} from '@/lib/booking-batch-create'

const groupRange = { start_date: '2026-09-11', end_date: '2026-09-14' }

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
        range: groupRange,
        valid: true,
      },
      {
        lines: [{ pet_id: 'p1', service_type: 'katzenbetreuung' as const }],
        range: groupRange,
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
          },
        ],
        range: null,
        valid: true,
      },
    ] as const

    for (const { lines, range, valid } of cases) {
      const result = validatePortalPetLines(lines, range)
      expect(result.valid).toBe(valid)
    }
  })
})
