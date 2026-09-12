import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyPetCarePlan } from '@/lib/pet-care-plan'
import {
  buildPetCarePlanBulkPdf,
  buildPetCarePlanPdf,
  petCarePlanBulkPdfFilename,
  petCarePlanPdfFilename,
} from '@/lib/pet-care-plan-pdf'

function createSamplePlan() {
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
      timing: 'mit Futter',
      medication: 'Apoquel',
      amount: '1/2 Tablette',
    },
  ]
  plan.intolerances = 'Rind'
  plan.individualWishes = 'Nur abends'
  return plan
}

describe('pet-care-plan-pdf', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds a single care plan pdf blob', async () => {
    const blob = await buildPetCarePlanPdf({
      petName: 'Baghira',
      customerName: 'Simone Günther',
      carePlan: createSamplePlan(),
      standDate: '2026-09-10T12:24:10.000Z',
    })

    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(500)
  })

  it('builds a bulk pdf with multiple plans', async () => {
    const blob = await buildPetCarePlanBulkPdf([
      {
        petName: 'Baghira',
        carePlan: createSamplePlan(),
        standDate: '2026-09-10T12:24:10.000Z',
      },
      {
        petName: 'Milo',
        summary: 'Legacy summary only',
        standDate: '2026-09-09T10:00:00.000Z',
      },
    ])

    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(800)
  })

  it('handles legacy summary-only input without crashing', async () => {
    const blob = await buildPetCarePlanPdf({
      petName: 'Baghira',
      summary: '1 Mahlzeit(en)/Tag · Unverträglichkeiten geändert',
      standDate: '2026-09-10T12:09:01.000Z',
    })

    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(200)
  })

  it('creates stable filenames', () => {
    expect(
      petCarePlanPdfFilename({
        petName: 'Baghira',
        standDate: '2026-09-10T12:24:10.000Z',
      })
    ).toBe('Pflegeplan_Baghira_2026-09-10.pdf')

    expect(petCarePlanBulkPdfFilename()).toMatch(/^Pflegeplaene_\d{4}-\d{2}-\d{2}\.pdf$/)
  })
})
