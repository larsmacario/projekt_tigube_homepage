import { describe, expect, it, vi, beforeEach } from 'vitest'

import { fetchPortalAvailabilitySnapshot } from '@/lib/portal-availability-client'

vi.mock('@/lib/authenticated-fetch', () => ({
  authenticatedFetch: vi.fn(),
}))

vi.mock('@/lib/portal-vacation-fallback', () => ({
  fetchVacationPeriodsFromNewsbar: vi.fn(),
}))

import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { fetchVacationPeriodsFromNewsbar } from '@/lib/portal-vacation-fallback'

describe('fetchPortalAvailabilitySnapshot', () => {
  beforeEach(() => {
    vi.mocked(authenticatedFetch).mockReset()
    vi.mocked(fetchVacationPeriodsFromNewsbar).mockReset()
  })

  it('nutzt Newsbar-Ferien wenn die API keine liefert', async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue(
      new Response(JSON.stringify({ vacationPeriods: [], closedDates: [] }), { status: 200 })
    )
    vi.mocked(fetchVacationPeriodsFromNewsbar).mockResolvedValue([
      { start_date: '2026-09-17', end_date: '2026-09-28', label: 'geschlossen' },
    ])

    const snapshot = await fetchPortalAvailabilitySnapshot({
      fromDate: '2026-10-01',
      toDate: '2027-12-31',
    })

    expect(snapshot.vacationPeriods).toHaveLength(1)
    expect(snapshot.vacationPeriods[0]?.start_date).toBe('2026-09-17')
  })

  it('behält API-Ferien wenn vorhanden', async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          vacationPeriods: [
            { start_date: '2026-11-27', end_date: '2026-12-07', label: 'geschlossen' },
          ],
          closedDates: [],
        }),
        { status: 200 }
      )
    )
    vi.mocked(fetchVacationPeriodsFromNewsbar).mockResolvedValue([
      { start_date: '2026-09-17', end_date: '2026-09-28', label: 'geschlossen' },
    ])

    const snapshot = await fetchPortalAvailabilitySnapshot({
      fromDate: '2026-10-01',
      toDate: '2027-12-31',
    })

    expect(snapshot.vacationPeriods.map((p) => p.start_date).sort()).toEqual([
      '2026-09-17',
      '2026-11-27',
    ])
  })
})
