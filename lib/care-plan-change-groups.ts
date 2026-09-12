import { getCurrentVersion, sortChangesByDateDesc } from '@/lib/care-plan-versions'
import type { PetCarePlanChange, PetCarePlanChangeGroup } from '@/lib/types'

export function groupCarePlanChanges(changes: PetCarePlanChange[]): PetCarePlanChangeGroup[] {
  const byPet = new Map<string, PetCarePlanChange[]>()

  for (const change of changes) {
    const existing = byPet.get(change.pet_id) ?? []
    existing.push(change)
    byPet.set(change.pet_id, existing)
  }

  const groups: PetCarePlanChangeGroup[] = []

  for (const [petId, petChanges] of byPet) {
    const sorted = sortChangesByDateDesc(petChanges)
    const latest = sorted[0]
    if (!latest) continue

    const current = getCurrentVersion(sorted)
    const unseen = sorted.filter((change) => change.seen_at == null)

    groups.push({
      pet_id: petId,
      customer_id: latest.customer_id,
      pet: latest.pet ?? null,
      customer: latest.customer ?? null,
      changes: sorted,
      latest_at: latest.changed_at,
      has_unseen: unseen.length > 0,
      unseen_count: unseen.length,
      current_change_id: current?.id ?? null,
      version_count: sorted.length,
      current_summary: current?.summary ?? latest.summary,
    })
  }

  return groups.sort(
    (a, b) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime()
  )
}
