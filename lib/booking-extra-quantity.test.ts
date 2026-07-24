import { describe, expect, it } from 'vitest'

import type { BookingExtraPrice } from '@/lib/booking-extras'
import {
  computeSuggestedExtraForPetLine,
  countBookingDaysForPet,
  formatExtraQuantityHint,
  inferExtraQuantityBehavior,
  parseFeedingsPerDay,
  suggestedExtraQuantity,
} from '@/lib/booking-extra-quantity'

function price(partial: Partial<BookingExtraPrice> & Pick<BookingExtraPrice, 'id' | 'name'>): BookingExtraPrice {
  return {
    category_id: 'c',
    description: null,
    price: 10,
    price_type: 'per_unit',
    unit: null,
    note: null,
    sort_order: 1,
    final_price: 10,
    catalog_price: 10,
    ...partial,
  }
}

describe('booking-extra-quantity', () => {
  it('parses feedings per day from description', () => {
    expect(
      parseFeedingsPerDay(
        price({
          id: '1',
          name: 'BARF',
          description: '2 Fütterungen pro Tag mitgebracht',
          unit: 'je Fütterung',
        })
      )
    ).toBe(2)
  })

  it('defaults feedings to 1 per day without explicit count', () => {
    expect(
      parseFeedingsPerDay(
        price({ id: '1', name: 'BARF', unit: 'je Fütterung' })
      )
    ).toBe(1)
  })

  it('infers syncPeriod from kalendertag unit', () => {
    expect(
      inferExtraQuantityBehavior(
        price({ id: '1', name: 'Läufig', unit: 'je angefangenem Tag' })
      )
    ).toBe('syncPeriod')
  })

  it('infers syncPeriodFeedings for fütterung', () => {
    expect(
      inferExtraQuantityBehavior(
        price({ id: '1', name: 'BARF', unit: 'je Fütterung' })
      )
    ).toBe('syncPeriodFeedings')
  })

  it('infers manual for je gabe and pauschal', () => {
    expect(
      inferExtraQuantityBehavior(
        price({ id: '1', name: 'Medikament', unit: 'je Gabe' })
      )
    ).toBe('manual')
    expect(
      inferExtraQuantityBehavior(
        price({ id: '1', name: 'Reinigung', unit: 'pauschal' })
      )
    ).toBe('manual')
  })

  it('infers manual for hol/bring and km', () => {
    expect(
      inferExtraQuantityBehavior(
        price({ id: '1', name: 'Schlüssel holen/bringen', unit: 'je holen und bringen' })
      )
    ).toBe('manual')
    expect(
      inferExtraQuantityBehavior(
        price({ id: '1', name: 'Fahrtkosten', unit: 'pro km' })
      )
    ).toBe('manual')
  })

  it('counts hundepension calendar days', () => {
    const days = countBookingDaysForPet(
      { pet_id: 'p1', service_type: 'hundepension' },
      { from: new Date(2026, 6, 24), to: new Date(2026, 6, 26) },
      {}
    )
    expect(days).toBe(3)
  })

  it('suggests feedings quantity as days times per day', () => {
    const p = price({
      id: '1',
      name: 'BARF',
      description: '2 Fütterungen pro Tag',
      unit: 'je Fütterung',
    })
    const behavior = inferExtraQuantityBehavior(p)
    expect(suggestedExtraQuantity(p, behavior, 5)).toBe(10)
  })

  it('returns null day count for katze', () => {
    expect(
      countBookingDaysForPet(
        { pet_id: 'p1', service_type: 'katzenbetreuung' },
        { from: new Date(2026, 6, 24), to: new Date(2026, 6, 26) },
        {}
      )
    ).toBeNull()
  })

  it('formats feeding hint', () => {
    const p = price({
      id: '1',
      name: 'BARF',
      description: '2 Fütterungen pro Tag',
      unit: 'je Fütterung',
    })
    const hint = formatExtraQuantityHint(p, 'syncPeriodFeedings', 5, 10)
    expect(hint).toContain('2 Fütterungen pro Tag')
    expect(hint).toContain('5 Tage')
    expect(hint).toContain('10')
  })

  it('computeSuggestedExtraForPetLine integrates line and price', () => {
    const p = price({ id: '1', name: 'Übernachtung', unit: 'je Nacht' })
    const result = computeSuggestedExtraForPetLine(
      { pet_id: 'p1', service_type: 'hundepension' },
      p,
      { from: new Date(2026, 6, 24), to: new Date(2026, 6, 24) },
      {}
    )
    expect(result.quantity).toBe(1)
    expect(result.behavior).toBe('syncPeriod')
  })
})
