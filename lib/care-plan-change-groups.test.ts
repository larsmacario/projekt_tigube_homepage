import { describe, expect, it } from 'vitest'
import { groupCarePlanChanges } from '@/lib/care-plan-change-groups'
import type { PetCarePlanChange } from '@/lib/types'

function change(
  partial: Partial<PetCarePlanChange> &
    Pick<PetCarePlanChange, 'id' | 'pet_id' | 'changed_at'>
): PetCarePlanChange {
  return {
    customer_id: 'customer-1',
    changed_by: null,
    summary: partial.summary ?? 'Summary',
    seen_at: null,
    care_plan_snapshot: { foodTypes: ['trocken'] },
    archived_at: null,
    ...partial,
  }
}

describe('care-plan-change-groups', () => {
  it('groups multiple changes for the same pet into one row', () => {
    const groups = groupCarePlanChanges([
      change({
        id: 'c1',
        pet_id: 'pet-1',
        changed_at: '2026-09-10T14:00:00.000Z',
        summary: 'Neuere Änderung',
      }),
      change({
        id: 'c2',
        pet_id: 'pet-1',
        changed_at: '2026-09-10T12:00:00.000Z',
        summary: 'Ältere Änderung',
      }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].version_count).toBe(2)
    expect(groups[0].current_change_id).toBe('c1')
    expect(groups[0].current_summary).toBe('Neuere Änderung')
  })

  it('keeps different pets in separate groups', () => {
    const groups = groupCarePlanChanges([
      change({ id: 'c1', pet_id: 'pet-1', changed_at: '2026-09-10T14:00:00.000Z' }),
      change({ id: 'c2', pet_id: 'pet-2', changed_at: '2026-09-10T13:00:00.000Z' }),
    ])

    expect(groups).toHaveLength(2)
    expect(groups.map((group) => group.pet_id).sort()).toEqual(['pet-1', 'pet-2'])
  })

  it('marks group as unseen when any change is unread', () => {
    const groups = groupCarePlanChanges([
      change({
        id: 'c1',
        pet_id: 'pet-1',
        changed_at: '2026-09-10T14:00:00.000Z',
        seen_at: '2026-09-10T14:05:00.000Z',
      }),
      change({
        id: 'c2',
        pet_id: 'pet-1',
        changed_at: '2026-09-10T12:00:00.000Z',
        seen_at: null,
      }),
    ])

    expect(groups[0].has_unseen).toBe(true)
    expect(groups[0].unseen_count).toBe(1)
  })
})
