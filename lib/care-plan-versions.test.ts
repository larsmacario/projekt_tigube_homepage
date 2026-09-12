import { describe, expect, it } from 'vitest'
import {
  canArchiveVersion,
  getCurrentVersion,
  getVersionChain,
  toPetCarePlanVersions,
} from '@/lib/care-plan-versions'
import type { PetCarePlanChange } from '@/lib/types'

function change(
  partial: Partial<PetCarePlanChange> & Pick<PetCarePlanChange, 'id' | 'changed_at'>
): PetCarePlanChange {
  return {
    pet_id: 'pet-1',
    customer_id: 'customer-1',
    changed_by: null,
    summary: partial.summary ?? 'Summary',
    seen_at: null,
    care_plan_snapshot: partial.care_plan_snapshot ?? { foodTypes: ['trocken'] },
    archived_at: null,
    ...partial,
  }
}

describe('care-plan-versions', () => {
  it('returns newest non-archived snapshot as current version', () => {
    const changes = [
      change({ id: 'v1', changed_at: '2026-09-10T12:00:00.000Z', summary: 'Alt' }),
      change({ id: 'v2', changed_at: '2026-09-10T14:00:00.000Z', summary: 'Neu' }),
    ]

    expect(getCurrentVersion(changes)?.id).toBe('v2')
  })

  it('skips archived versions when determining current', () => {
    const changes = [
      change({
        id: 'v2',
        changed_at: '2026-09-10T14:00:00.000Z',
        summary: 'Neu archiviert',
        archived_at: '2026-09-10T15:00:00.000Z',
      }),
      change({ id: 'v1', changed_at: '2026-09-10T12:00:00.000Z', summary: 'Alt aktiv' }),
    ]

    expect(getCurrentVersion(changes)?.id).toBe('v1')
  })

  it('builds version chain newest first with snapshots only', () => {
    const changes = [
      change({ id: 'v2', changed_at: '2026-09-10T14:00:00.000Z' }),
      change({ id: 'v1', changed_at: '2026-09-10T12:00:00.000Z', care_plan_snapshot: null }),
    ]

    expect(getVersionChain(changes).map((item) => item.id)).toEqual(['v2'])
  })

  it('prevents archiving the current version', () => {
    const changes = [
      change({ id: 'v2', changed_at: '2026-09-10T14:00:00.000Z' }),
      change({ id: 'v1', changed_at: '2026-09-10T12:00:00.000Z' }),
    ]

    expect(canArchiveVersion(changes[1], changes)).toBe(true)
    expect(canArchiveVersion(changes[0], changes)).toBe(false)
  })

  it('maps versions with is_current flag', () => {
    const changes = [
      change({ id: 'v2', changed_at: '2026-09-10T14:00:00.000Z' }),
      change({ id: 'v1', changed_at: '2026-09-10T12:00:00.000Z' }),
    ]

    const versions = toPetCarePlanVersions(changes)
    expect(versions[0].is_current).toBe(true)
    expect(versions[1].is_current).toBe(false)
  })
})
