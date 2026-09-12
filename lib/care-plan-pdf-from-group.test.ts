import { describe, expect, it } from 'vitest'
import { pdfInputFromChangeGroup } from '@/lib/care-plan-pdf-from-group'
import type { PetCarePlanChangeGroup } from '@/lib/types'

function group(partial: Partial<PetCarePlanChangeGroup>): PetCarePlanChangeGroup {
  return {
    pet_id: 'pet-1',
    customer_id: 'customer-1',
    pet: { id: 'pet-1', name: 'Baghira' },
    customer: { id: 'customer-1', vorname: 'Simone', nachname: 'Günther', email: null },
    changes: [],
    latest_at: '2026-09-10T14:00:00.000Z',
    has_unseen: true,
    unseen_count: 1,
    current_change_id: 'change-new',
    version_count: 2,
    current_summary: 'Neu',
    ...partial,
  }
}

describe('care-plan-pdf-from-group', () => {
  it('uses current change snapshot for pdf input', () => {
    const input = pdfInputFromChangeGroup(
      group({
        changes: [
          {
            id: 'change-new',
            pet_id: 'pet-1',
            customer_id: 'customer-1',
            changed_at: '2026-09-10T14:00:00.000Z',
            changed_by: null,
            summary: 'Neu',
            seen_at: null,
            care_plan_snapshot: { foodTypes: ['trocken'] },
          },
          {
            id: 'change-old',
            pet_id: 'pet-1',
            customer_id: 'customer-1',
            changed_at: '2026-09-10T12:00:00.000Z',
            changed_by: null,
            summary: 'Alt',
            seen_at: null,
            care_plan_snapshot: null,
          },
        ],
      })
    )

    expect(input.petName).toBe('Baghira')
    expect(input.customerName).toBe('Simone Günther')
    expect(input.carePlan).toEqual({ foodTypes: ['trocken'] })
    expect(input.summary).toBe('Neu')
  })

  it('supports explicit change id override', () => {
    const input = pdfInputFromChangeGroup(
      group({
        changes: [
          {
            id: 'change-new',
            pet_id: 'pet-1',
            customer_id: 'customer-1',
            changed_at: '2026-09-10T14:00:00.000Z',
            changed_by: null,
            summary: 'Neu',
            seen_at: null,
            care_plan_snapshot: { foodTypes: ['trocken'] },
          },
          {
            id: 'change-old',
            pet_id: 'pet-1',
            customer_id: 'customer-1',
            changed_at: '2026-09-10T12:00:00.000Z',
            changed_by: null,
            summary: 'Alt',
            seen_at: null,
            care_plan_snapshot: null,
          },
        ],
      }),
      'change-old'
    )

    expect(input.summary).toBe('Alt')
    expect(input.carePlan).toBeUndefined()
  })
})
