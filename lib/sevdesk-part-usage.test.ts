import { describe, expect, it } from 'vitest'

import {
  buildSevdeskPartUsageCounts,
  formatSevdeskUsageBadgeLabel,
  formatSevdeskUsageHint,
  sortAddonServicesBySevdeskUsage,
} from '@/lib/sevdesk-part-usage'
import type { AddonService } from '@/lib/types'

const baseService = (overrides: Partial<AddonService> = {}): AddonService => ({
  id: 'svc-1',
  title: 'Medikamentengabe',
  description: null,
  amount: 12.5,
  sort_order: 1,
  is_active: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('sevdesk-part-usage', () => {
  it('buildSevdeskPartUsageCounts counts invoice positions per part id', () => {
    const counts = buildSevdeskPartUsageCounts([
      { partId: '101' },
      { partId: '101' },
      { partId: '202' },
      { partId: null },
    ])

    expect(counts.get('101')).toBe(2)
    expect(counts.get('202')).toBe(1)
    expect(counts.has('303')).toBe(false)
  })

  it('sortAddonServicesBySevdeskUsage sorts by usage desc then sort_order then title', () => {
    const sorted = sortAddonServicesBySevdeskUsage([
      baseService({ id: 'low', title: 'B', sort_order: 1, sevdesk_usage_count: 1 }),
      baseService({ id: 'high', title: 'A', sort_order: 5, sevdesk_usage_count: 10 }),
      baseService({ id: 'mid', title: 'C', sort_order: 2, sevdesk_usage_count: 10 }),
    ])

    expect(sorted.map((service) => service.id)).toEqual(['mid', 'high', 'low'])
  })

  it('formatSevdeskUsageBadgeLabel provides compact badge text', () => {
    expect(
      formatSevdeskUsageBadgeLabel({ sevdesk_usage_count: 0, sevdesk_usage_synced_at: null }, { linked: true })
    ).toBe('Nutzung offen')

    expect(
      formatSevdeskUsageBadgeLabel({
        sevdesk_usage_count: 12,
        sevdesk_usage_synced_at: '2026-01-01T00:00:00.000Z',
      })
    ).toBe('12× Rechnungen')
  })

  it('formatSevdeskUsageHint describes invoice usage separately from link status', () => {
    expect(
      formatSevdeskUsageHint({ sevdesk_usage_count: 0, sevdesk_usage_synced_at: null }, { linked: true })
    ).toBe('Rechnungsnutzung: wird beim nächsten SevDesk-Import gezählt')

    expect(
      formatSevdeskUsageHint({ sevdesk_usage_count: 0, sevdesk_usage_synced_at: null }, { linked: false })
    ).toBeNull()

    expect(
      formatSevdeskUsageHint({
        sevdesk_usage_count: 12,
        sevdesk_usage_synced_at: '2026-01-01T00:00:00.000Z',
      })
    ).toBe('Rechnungsnutzung: 12× auf Rechnungen')
  })
})
