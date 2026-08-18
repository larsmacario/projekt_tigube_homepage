import { describe, expect, it } from 'vitest'
import {
  PET_GESCHLECHT_OPTIONS,
  formatPetGeschlecht,
  normalizePetGeschlecht,
} from '@/lib/pet-form-options'

describe('pet-form-options geschlecht', () => {
  it('contains rüde_kastriert_chemisch option instead of gechipt', () => {
    expect(PET_GESCHLECHT_OPTIONS).toEqual([
      { value: 'hündin', label: 'Hündin' },
      { value: 'rüde', label: 'Rüde' },
      { value: 'rüde_kastriert', label: 'Rüde - kastriert' },
      { value: 'rüde_kastriert_chemisch', label: 'Rüde - kastriert - chemisch' },
      { value: 'hündin_kastriert', label: 'Hündin - kastriert' },
    ])
  })

  it('formats known and legacy values properly', () => {
    expect(formatPetGeschlecht('rüde_kastriert_chemisch')).toBe('Rüde - kastriert - chemisch')
    expect(formatPetGeschlecht('rüde_kastriert_gechipt')).toBe('Rüde - kastriert - chemisch')
    expect(formatPetGeschlecht('rüde_kastriert')).toBe('Rüde - kastriert')
    expect(formatPetGeschlecht('hündin')).toBe('Hündin')
    expect(formatPetGeschlecht('rüde')).toBe('Rüde')
    expect(formatPetGeschlecht('hündin_kastriert')).toBe('Hündin - kastriert')
    expect(formatPetGeschlecht('Unbekannt')).toBe('Unbekannt')
    expect(formatPetGeschlecht(null)).toBe('')
    expect(formatPetGeschlecht(undefined)).toBe('')
  })

  it('normalizes legacy rüde_kastriert_gechipt to rüde_kastriert_chemisch', () => {
    expect(normalizePetGeschlecht('rüde_kastriert_gechipt')).toBe('rüde_kastriert_chemisch')
    expect(normalizePetGeschlecht('rüde_kastriert_chemisch')).toBe('rüde_kastriert_chemisch')
    expect(normalizePetGeschlecht('rüde')).toBe('rüde')
    expect(normalizePetGeschlecht(null)).toBe('')
  })
})
