import { describe, expect, it } from 'vitest'
import { resolveContactVacationConflict } from '@/lib/contact-vacation-conflict'
import type { VacationDate } from '@/lib/vacation-dates'

const vacationDates: VacationDate[] = [
  {
    id: '1',
    period: '24.12.2026 bis 02.01.2027',
    label: 'Weihnachtsferien',
    start_date: '2026-12-24',
    end_date: '2027-01-02',
  },
]

describe('resolveContactVacationConflict', () => {
  it('erkennt Überlappung mit Betriebsferien', () => {
    const result = resolveContactVacationConflict({
      service: 'hundepension',
      konkreterUrlaub: 'ja',
      urlaubVon: '2026-12-26',
      urlaubBis: '2026-12-28',
      vacationDates,
    })

    expect(result.conflict).toBe(true)
    expect(result.overlappingPeriod?.id).toBe('1')
  })

  it('findet keinen Konflikt außerhalb der Betriebsferien', () => {
    const result = resolveContactVacationConflict({
      service: 'hundepension',
      konkreterUrlaub: 'ja',
      urlaubVon: '2026-08-01',
      urlaubBis: '2026-08-14',
      vacationDates,
    })

    expect(result.conflict).toBe(false)
  })

  it('prüft nicht bei konkreterUrlaub nein', () => {
    const result = resolveContactVacationConflict({
      service: 'hundepension',
      konkreterUrlaub: 'nein',
      urlaubVon: '2026-12-26',
      urlaubBis: '2026-12-28',
      vacationDates,
    })

    expect(result.conflict).toBe(false)
  })

  it('prüft nicht bei Tagesbetreuung', () => {
    const result = resolveContactVacationConflict({
      service: 'tagesbetreuung',
      konkreterUrlaub: 'ja',
      urlaubVon: '2026-12-26',
      urlaubBis: '2026-12-28',
      vacationDates,
    })

    expect(result.conflict).toBe(false)
  })

  it('prüft nicht bei Katzenbetreuung', () => {
    const result = resolveContactVacationConflict({
      service: 'katzenbetreuung',
      konkreterUrlaub: 'ja',
      urlaubVon: '2026-12-26',
      urlaubBis: '2026-12-28',
      vacationDates,
    })

    expect(result.conflict).toBe(false)
  })
})
