import { describe, expect, it } from 'vitest'
import { busyIntervalsToBlockedIsoDates } from '@/lib/google-calendar-busy'

describe('google-calendar-busy', () => {
  it('markiert Tage mit Busy-Intervall als blockiert', () => {
    const blocked = busyIntervalsToBlockedIsoDates(
      [{ start: '2026-06-15T10:00:00+02:00', end: '2026-06-15T11:00:00+02:00' }],
      '2026-06-14',
      '2026-06-16',
      'Europe/Berlin'
    )
    expect(blocked).toEqual(['2026-06-15'])
  })

  it('behandelt Ganztages-Belegung', () => {
    const blocked = busyIntervalsToBlockedIsoDates(
      [{ start: '2026-07-01', end: '2026-07-02' }],
      '2026-06-30',
      '2026-07-02',
      'Europe/Berlin'
    )
    expect(blocked).toContain('2026-07-01')
  })

  it('liefert keine Duplikate bei mehreren Intervallen am selben Tag', () => {
    const blocked = busyIntervalsToBlockedIsoDates(
      [
        { start: '2026-08-10T08:00:00+02:00', end: '2026-08-10T09:00:00+02:00' },
        { start: '2026-08-10T18:00:00+02:00', end: '2026-08-10T19:00:00+02:00' },
      ],
      '2026-08-10',
      '2026-08-10',
      'Europe/Berlin'
    )
    expect(blocked).toEqual(['2026-08-10'])
  })
})
