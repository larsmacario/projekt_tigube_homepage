import { describe, expect, it } from 'vitest'

import {
  isCat,
  isCatCustomer,
  isCatPetContext,
  requiresImpfpass,
} from '@/lib/cat-customer'
import { getPetCompletenessIssues, getPetSaveWarnings } from '@/lib/pet-vaccination'

describe('cat-customer', () => {
  it('erkennt Katzen-Tierart und SevDesk-Tag', () => {
    expect(isCat('Katze')).toBe(true)
    expect(isCat('Hund')).toBe(false)
    expect(isCatCustomer({ sevdesk_tags: ['aktiv', 'cat'] })).toBe(true)
    expect(isCatCustomer({ sevdesk_tags: ['aktiv'] })).toBe(false)
  })

  it('isCatPetContext ist wahr bei Tag oder Tierart', () => {
    expect(isCatPetContext({ tierart: 'Katze' })).toBe(true)
    expect(isCatPetContext({ tierart: 'Hund', customer: { sevdesk_tags: ['cat'] } })).toBe(true)
    expect(isCatPetContext({ tierart: 'Hund', customer: { sevdesk_tags: [] } })).toBe(false)
  })

  it('requiresImpfpass ist für Katzen-Kontext false', () => {
    expect(requiresImpfpass({ tierart: 'Katze' })).toBe(false)
    expect(requiresImpfpass({ tierart: 'Hund', customer: { sevdesk_tags: ['cat'] } })).toBe(false)
    expect(requiresImpfpass({ tierart: 'Hund' })).toBe(true)
  })
})

describe('pet-vaccination cat context', () => {
  const pet = {
    id: 'pet-1',
    tierart: 'Katze',
    letzte_impfung: null,
    intervall_impfung: null,
    letzte_impfung_zusatz: null,
    letzte_stuhlprobe: null,
    naechste_stuhlprobe: null,
  }

  it('verlangt keinen Impfpass für Katzen', () => {
    const issues = getPetCompletenessIssues(pet, [], null)
    expect(issues).not.toContain('Impfpass')
  })

  it('warnt nicht über fehlenden Impfpass beim Speichern', () => {
    const warnings = getPetSaveWarnings({
      formData: {
        name: 'Mimi',
        tierart: 'Katze',
        letzte_impfung: '',
        intervall_impfung: '',
        letzte_impfung_zusatz: '',
        letzte_stuhlprobe: '',
        naechste_stuhlprobe: '',
      },
      documents: [],
      impfpassCount: 0,
      wurmtestFiles: [],
      photoCount: 1,
    })
    expect(warnings).not.toContain('Impfpass')
  })
})
