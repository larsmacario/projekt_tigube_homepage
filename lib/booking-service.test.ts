import { describe, expect, it } from 'vitest'
import {
  getServicesForPetType,
  isServiceAllowedForPetType,
} from '@/lib/booking-service'

describe('booking services by pet type', () => {
  it('bietet für Hunde nur Hundeservices an', () => {
    expect(getServicesForPetType('Hund').map((service) => service.value)).toEqual([
      'hundepension',
      'tagesbetreuung',
    ])
    expect(isServiceAllowedForPetType('katzenbetreuung', 'Hund')).toBe(false)
  })

  it('bietet für Katzen nur Katzenbetreuung an', () => {
    expect(getServicesForPetType('Katze').map((service) => service.value)).toEqual([
      'katzenbetreuung',
    ])
    expect(isServiceAllowedForPetType('hundepension', 'Katze')).toBe(false)
  })

  it('bietet für andere Tierarten keinen Service an', () => {
    expect(getServicesForPetType('Andere')).toEqual([])
  })
})
