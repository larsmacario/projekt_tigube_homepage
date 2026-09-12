import type { PetCarePlanChange, PetCarePlanVersion } from '@/lib/types'

export function isArchivedChange(change: Pick<PetCarePlanChange, 'archived_at'>): boolean {
  return change.archived_at != null
}

export function hasCarePlanSnapshot(
  change: Pick<PetCarePlanChange, 'care_plan_snapshot'>
): boolean {
  return change.care_plan_snapshot != null
}

export function sortChangesByDateDesc(changes: PetCarePlanChange[]): PetCarePlanChange[] {
  return [...changes].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  )
}

export function getCurrentVersion(changes: PetCarePlanChange[]): PetCarePlanChange | null {
  const sorted = sortChangesByDateDesc(changes)
  return (
    sorted.find(
      (change) => !isArchivedChange(change) && hasCarePlanSnapshot(change)
    ) ??
    sorted.find((change) => !isArchivedChange(change)) ??
    null
  )
}

export function getVersionChain(changes: PetCarePlanChange[]): PetCarePlanChange[] {
  return sortChangesByDateDesc(changes).filter(hasCarePlanSnapshot)
}

export function canArchiveVersion(
  change: PetCarePlanChange,
  changes: PetCarePlanChange[]
): boolean {
  if (isArchivedChange(change)) return false
  if (!hasCarePlanSnapshot(change)) return false

  const current = getCurrentVersion(changes)
  if (!current) return false
  return change.id !== current.id
}

export function toPetCarePlanVersions(changes: PetCarePlanChange[]): PetCarePlanVersion[] {
  const current = getCurrentVersion(changes)
  const chain = getVersionChain(changes)

  return chain.map((change) => ({
    id: change.id,
    changed_at: change.changed_at,
    summary: change.summary,
    seen_at: change.seen_at,
    archived_at: change.archived_at ?? null,
    care_plan_snapshot: change.care_plan_snapshot ?? null,
    is_current: current?.id === change.id,
  }))
}
