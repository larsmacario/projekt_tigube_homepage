import { describe, expect, it } from 'vitest'

import {
  envelopeFromBlocks,
  expandBlockToIsoDates,
  mergeIsoDates,
  normalizeDateBlocksFromRequest,
  validateDateBlocks,
} from '@/lib/booking-date-blocks'

describe('booking-date-blocks', () => {
  it('expandiert Block mit Wochentagsfilter', () => {
    const dates = expandBlockToIsoDates({
      start_date: '2026-09-07',
      end_date: '2026-09-13',
      weekdays: [1, 3, 5],
    })
    expect(dates).toEqual(['2026-09-07', '2026-09-09', '2026-09-11'])
  })

  it('merge dedupliziert ISO-Daten', () => {
    expect(mergeIsoDates(['2026-09-11', '2026-09-12'], ['2026-09-12', '2026-09-14'])).toEqual([
      '2026-09-11',
      '2026-09-12',
      '2026-09-14',
    ])
  })

  it('envelopeFromBlocks liefert min/max', () => {
    expect(
      envelopeFromBlocks([
        { start_date: '2026-09-20', end_date: '2026-09-25' },
        { start_date: '2026-09-11', end_date: '2026-09-14' },
      ])
    ).toEqual({ start_date: '2026-09-11', end_date: '2026-09-25' })
  })

  it('normalisiert Legacy start/end', () => {
    expect(
      normalizeDateBlocksFromRequest({
        start_date: '2026-09-11',
        end_date: '2026-09-14',
      })
    ).toEqual([{ start_date: '2026-09-11', end_date: '2026-09-14' }])
  })

  it('validateDateBlocks lehnt leere Liste ab', () => {
    expect(validateDateBlocks([]).valid).toBe(false)
  })
})
