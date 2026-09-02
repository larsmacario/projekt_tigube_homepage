import { Badge } from '@/components/ui/badge'
import { formatSevdeskUsageBadgeLabel, formatSevdeskUsageHint } from '@/lib/sevdesk-part-usage'
import type { SevdeskSyncStatus } from '@/lib/types'

export function getSevdeskSyncLabel(status: SevdeskSyncStatus | null | undefined): string {
  switch (status) {
    case 'synced':
      return 'SevDesk verknüpft'
    case 'pending':
      return 'Verknüpfung läuft…'
    case 'failed':
      return 'Verknüpfung fehlgeschlagen'
    default:
      return 'Nicht verknüpft'
  }
}

export function getSevdeskSyncVariant(
  status: SevdeskSyncStatus | null | undefined
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'synced':
      return 'default'
    case 'failed':
      return 'destructive'
    case 'pending':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function SevdeskLinkBadge({ status }: { status?: SevdeskSyncStatus | null }) {
  return <Badge variant={getSevdeskSyncVariant(status)}>{getSevdeskSyncLabel(status)}</Badge>
}

export function SevdeskUsageBadge({
  usageCount,
  usageSyncedAt,
  linked,
}: {
  usageCount?: number
  usageSyncedAt?: string | null
  linked: boolean
}) {
  const label = formatSevdeskUsageBadgeLabel(
    {
      sevdesk_usage_count: usageCount,
      sevdesk_usage_synced_at: usageSyncedAt,
    },
    { linked }
  )

  if (!label) return null

  return (
    <Badge variant="secondary" className="font-normal">
      {label}
    </Badge>
  )
}

export function SevdeskArticleMeta({
  articleId,
  partNumber,
  error,
  status,
  usageCount,
  usageSyncedAt,
}: {
  status?: SevdeskSyncStatus | null
  articleId?: string | null
  partNumber?: string | null
  error?: string | null
  usageCount?: number
  usageSyncedAt?: string | null
}) {
  const isLinked = Boolean(articleId)
  const usageHint = formatSevdeskUsageHint(
    {
      sevdesk_usage_count: usageCount,
      sevdesk_usage_synced_at: usageSyncedAt,
    },
    { linked: isLinked }
  )

  if (!isLinked && status !== 'failed') {
    return null
  }

  return (
    <div className="space-y-1 text-sm">
      {isLinked && partNumber ? (
        <p className="font-mono font-medium text-sage-800">Artikelnummer: {partNumber}</p>
      ) : null}
      {isLinked && !partNumber ? (
        <p className="text-xs text-sage-500">Artikelnummer nicht hinterlegt</p>
      ) : null}
      {isLinked && articleId ? (
        <p className="text-xs font-mono text-sage-400">ID: {articleId}</p>
      ) : null}
      {usageHint ? <p className="text-xs text-sage-600">{usageHint}</p> : null}
      {status === 'failed' && error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

/** Kombiniert Meta-Block (Legacy-Kompatibilität für Preise-Seite). */
export function SevdeskArticleSyncBadge({
  status,
  articleId,
  partNumber,
  error,
  usageCount,
  usageSyncedAt,
}: {
  status?: SevdeskSyncStatus | null
  articleId?: string | null
  partNumber?: string | null
  error?: string | null
  usageCount?: number
  usageSyncedAt?: string | null
}) {
  const isLinked = Boolean(articleId)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SevdeskLinkBadge status={status} />
        <SevdeskUsageBadge
          usageCount={usageCount}
          usageSyncedAt={usageSyncedAt}
          linked={isLinked}
        />
      </div>
      <SevdeskArticleMeta
        status={status}
        articleId={articleId}
        partNumber={partNumber}
        error={error}
        usageCount={usageCount}
        usageSyncedAt={usageSyncedAt}
      />
    </div>
  )
}

export function canRetrySevdeskArticleLink(input: {
  status?: SevdeskSyncStatus | null
  articleId?: string | null
}): boolean {
  if (input.articleId && input.status === 'synced') {
    return false
  }
  return input.status === 'failed' || input.status === 'none' || !input.status
}
