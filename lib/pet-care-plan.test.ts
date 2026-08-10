import { describe, expect, it } from 'vitest'
import {
  carePlanToLegacyFields,
  emptyPetCarePlan,
  getActiveFeedingSlotCount,
  getActiveMedicationSlotCount,
  hasCarePlanChanged,
  isCarePlanComplete,
  nextTimeSlot,
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

  it('migrates legacy medication slots to entry list', () => {
    const legacyPlan = {
      foodTypes: ['trocken'],
      intolerances: '',
      individualWishes: '',
      feeding: [
        { enabled: true, time: '6 Uhr', food: 'Trocken', amount: '200g', additive: '', additiveAmount: '' },
        { enabled: false, time: '', food: '', amount: '', additive: '', additiveAmount: '' },
        { enabled: false, time: '', food: '', amount: '', additive: '', additiveAmount: '' },
      ],
      medication: [
        { enabled: true, timing: '½ h vor Futter', medication: 'Apoquel', amount: '½ Tablette' },
        { enabled: false, timing: '', medication: '', amount: '' },
        { enabled: true, timing: 'mit Futter', medication: 'Herzmedikament', amount: '1 Tablette' },
      ],
    }

    const plan = normalizeCarePlan(legacyPlan)
    expect(plan?.medication).toEqual([
      {
        timeSlot: 'Morgens',
        timing: '½ h vor Futter',
        medication: 'Apoquel',
        amount: '½ Tablette',
      },
      {
        timeSlot: 'Abends',
        timing: 'mit Futter',
        medication: 'Herzmedikament',
        amount: '1 Tablette',
      },
    ])
  })

  it('accepts multiple medications for the same time slot', () => {
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
    plan.medication = [
      {
        timeSlot: 'Morgens',
        timing: '½ h vor Futter',
        medication: 'Apoquel',
        amount: '½ Tablette',
      },
      {
        timeSlot: 'Morgens',
        timing: 'mit Futter',
        medication: 'Herzmedikament',
        amount: '1 Tablette',
      },
    ]

    expect(validateCarePlan(plan)).toBeNull()
    expect(getActiveMedicationSlotCount(plan)).toBe(2)
    expect(isCarePlanComplete({ care_plan: plan, futtermenge: null, medikamente: null, besonderheiten: null })).toBe(true)
  })

  it('rejects incomplete medication entries', () => {
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
    plan.medication = [
      {
        timeSlot: 'Morgens',
        timing: '½ h vor Futter',
        medication: 'Apoquel',
        amount: '',
      },
    ]

    expect(validateCarePlan(plan)).toContain('Morgens (Apoquel)')
  })

  it('cycles time slots for duplicate medication rows', () => {
    expect(nextTimeSlot('Morgens')).toBe('Mittags')
    expect(nextTimeSlot('Mittags')).toBe('Abends')
    expect(nextTimeSlot('Abends')).toBe('Morgens')
  })

  it('writes one legacy line per medication entry', () => {
    const plan = emptyPetCarePlan()
    plan.medication = [
      {
        timeSlot: 'Morgens',
        timing: '½ h vor Futter',
        medication: 'Apoquel',
        amount: '½ Tablette',
      },
      {
        timeSlot: 'Morgens',
        timing: 'mit Futter',
        medication: 'Herzmedikament',
        amount: '1 Tablette',
      },
    ]

    const legacy = carePlanToLegacyFields(plan)
    expect(legacy.medikamente).toBe(
      'Morgens (½ h vor Futter): Apoquel ½ Tablette\nMorgens (mit Futter): Herzmedikament 1 Tablette'
    )
  })
})
