import { describe, expect, it } from 'vitest'
import {
  carePlanToLegacyFields,
  emptyPetCarePlan,
  getActiveFeedingSlotCount,
  hasCarePlanChanged,
  isCarePlanComplete,
  normalizeCarePlan,
  validateCarePlan,
} from '@/lib/pet-care-plan'

describe('pet-care-plan', () => {
  it('normalizes empty input to null', () => {
    expect(normalizeCarePlan(null)).toBeNull()
    expect(normalizeCarePlan(undefined)).toBeNull()
  })

  it('validates minimum feeding requirements', () => {
    const plan = emptyPetCarePlan()
    plan.foodTypes = ['trocken']
    plan.feeding[0] = {
      enabled: true,
      time: '6 Uhr',
      food: 'Trockenfutter',
      amount: '200g',
      additive: '',
      additiveAmount: '',
    }

    expect(validateCarePlan(plan)).toBeNull()
    expect(isCarePlanComplete({ care_plan: plan, futtermenge: null, medikamente: null, besonderheiten: null })).toBe(true)
    expect(getActiveFeedingSlotCount(plan)).toBe(1)
  })

  it('detects changes and builds legacy summary', () => {
    const before = emptyPetCarePlan()
    const after = emptyPetCarePlan()
    after.foodTypes = ['dose']
    after.feeding[2] = {
      enabled: true,
      time: '19 Uhr',
      food: 'Dose',
      amount: '200g',
      additive: 'Öl',
      additiveAmount: '1 TL',
    }

    expect(hasCarePlanChanged(before, after)).toBe(true)

    const legacy = carePlanToLegacyFields(after)
    expect(legacy.futtermenge).toContain('Abends 19 Uhr')
    expect(legacy.futtermenge).toContain('Öl')
  })
})
