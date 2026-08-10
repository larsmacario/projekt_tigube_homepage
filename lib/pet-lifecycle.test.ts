import { describe, expect, it } from 'vitest'

import { formatDeceasedLabel, isPetDeceased } from '@/lib/pet-lifecycle'
import { normalizePetPayload, validatePetPayload } from '@/lib/pet-payload'

describe('pet-lifecycle', () => {
  it('erkennt verstorbene Tiere anhand deceased_at', () => {
    expect(isPetDeceased({ deceased_at: '2024-01-15' })).toBe(true)
    expect(isPetDeceased({ deceased_at: null })).toBe(false)
    expect(isPetDeceased({ deceased_at: '' })).toBe(false)
  })

  it('formatiert das Verstorben-Datum auf Deutsch', () => {
    expect(formatDeceasedLabel('2024-01-15')).toBe('Verstorben seit 15.01.2024')
  })
})

describe('pet-payload deceased_at', () => {
  it('normalisiert leere deceased_at-Werte zu null', () => {
    const normalized = normalizePetPayload({ deceased_at: '  ' })
    expect(normalized.deceased_at).toBeNull()
  })

  it('akzeptiert null für deceased_at', () => {
    expect(validatePetPayload({ deceased_at: null })).toBeNull()
  })

  it('lehnt zukünftige deceased_at-Daten ab', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const futureIso = future.toISOString().split('T')[0]

    expect(validatePetPayload({ deceased_at: futureIso })).toBe(
      'Das Datum darf nicht in der Zukunft liegen.'
    )
  })

  it('akzeptiert vergangene deceased_at-Daten', () => {
    expect(validatePetPayload({ deceased_at: '2020-06-01' })).toBeNull()
  })
})
