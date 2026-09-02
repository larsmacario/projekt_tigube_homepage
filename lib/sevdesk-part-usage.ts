import type { AddonService } from '@/lib/types'

export interface SevdeskInvoicePositionRef {
  partId: string | null
}

export function buildSevdeskPartUsageCounts(
  positions: SevdeskInvoicePositionRef[]
): Map<string, number> {
  const counts = new Map<string, number>()

  for (const position of positions) {
    if (!position.partId) continue
    counts.set(position.partId, (counts.get(position.partId) ?? 0) + 1)
  }

  return counts
}

export function sortAddonServicesBySevdeskUsage(services: AddonService[]): AddonService[] {
  return [...services].sort((a, b) => {
    const usageDiff = (b.sevdesk_usage_count ?? 0) - (a.sevdesk_usage_count ?? 0)
    if (usageDiff !== 0) return usageDiff

    const sortDiff = a.sort_order - b.sort_order
    if (sortDiff !== 0) return sortDiff

    return a.title.localeCompare(b.title, 'de')
  })
}

export function formatSevdeskUsageBadgeLabel(
  service: Pick<AddonService, 'sevdesk_usage_count' | 'sevdesk_usage_synced_at'>,
  options?: { linked?: boolean }
): string | null {
  if (service.sevdesk_usage_synced_at) {
    const count = service.sevdesk_usage_count ?? 0
    if (count === 0) return '0× Rechnungen'
    return count === 1 ? '1× Rechnung' : `${count}× Rechnungen`
  }

  if (options?.linked) {
    return 'Nutzung offen'
  }

  return null
}

export function formatSevdeskUsageHint(
  service: Pick<AddonService, 'sevdesk_usage_count' | 'sevdesk_usage_synced_at'>,
  options?: { linked?: boolean }
): string | null {
  if (service.sevdesk_usage_synced_at) {
    const count = service.sevdesk_usage_count ?? 0
    if (count === 0) {
      return 'Rechnungsnutzung: bisher 0× auf Rechnungen'
    }
    return count === 1
      ? 'Rechnungsnutzung: 1× auf Rechnungen'
      : `Rechnungsnutzung: ${count}× auf Rechnungen`
  }

  if (options?.linked) {
    return 'Rechnungsnutzung: wird beim nächsten SevDesk-Import gezählt'
  }

  return null
}

/** @deprecated Nutze formatSevdeskUsageHint – kein Badge-Text mehr */
export function formatSevdeskUsageLabel(service: Pick<AddonService, 'sevdesk_usage_count' | 'sevdesk_usage_synced_at'>): string {
  return (
    formatSevdeskUsageHint(service, { linked: true }) ??
    'Rechnungsnutzung: wird beim nächsten SevDesk-Import gezählt'
  )
}
