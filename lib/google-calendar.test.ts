import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getGoogleBlockedDatesForRange,
  getGoogleCalendarAdminSnapshot,
  getGoogleCalendarRedirectUri,
  isGoogleCalendarInfrastructureError,
} from '@/lib/google-calendar'
import { DEFAULT_PUBLIC_SITE_URL } from '@/lib/site-url'

const mockFrom = vi.fn()
const mockGetAdminDbClient = vi.fn(() => ({
  from: mockFrom,
}))

vi.mock('@/lib/admin-auth', () => ({
  getAdminDbClient: () => mockGetAdminDbClient(),
}))

describe('google-calendar fail-open', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.NEXT_PUBLIC_SITE_URL
  })

  it('nutzt die kanonische Produktions-Redirect-URI', () => {
    expect(getGoogleCalendarRedirectUri()).toBe(
      `${DEFAULT_PUBLIC_SITE_URL}/api/admin/integrations/google-calendar/oauth/callback`
    )
  })

  it('erkennt fehlende Tabelle als Infrastruktur-Fehler', () => {
    expect(
      isGoogleCalendarInfrastructureError({
        code: 'PGRST205',
        message: "Could not find the table 'public.google_calendar_settings' in the schema cache",
      })
    ).toBe(true)
  })

  it('Admin-Snapshot meldet fehlende Migration statt Fehler', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: {
              code: 'PGRST205',
              message:
                "Could not find the table 'public.google_calendar_settings' in the schema cache",
            },
          }),
        }),
      }),
    })

    const snapshot = await getGoogleCalendarAdminSnapshot()
    expect(snapshot.migrationRequired).toBe(true)
    expect(snapshot.settings).toBeNull()
    expect(snapshot.setupMessage).toContain('Migration')
  })

  it('liefert keine blockierten Tage wenn Settings nicht geladen werden können', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: {
              code: 'PGRST205',
              message:
                "Could not find the table 'public.google_calendar_settings' in the schema cache",
            },
          }),
        }),
      }),
    })

    const blocked = await getGoogleBlockedDatesForRange('2026-09-01', '2026-09-30')
    expect(blocked).toEqual([])
  })

  it('liefert keine blockierten Tage wenn Blockierung deaktiviert ist', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'google_calendar',
              blocking_enabled: false,
              is_connected: true,
              calendar_id: 'primary',
              timezone: 'Europe/Berlin',
            },
            error: null,
          }),
        }),
      }),
    })

    const blocked = await getGoogleBlockedDatesForRange('2026-09-01', '2026-09-30')
    expect(blocked).toEqual([])
  })
})
