import { describe, expect, it } from 'vitest'

import {
  BOOKING_ESTIMATE_DISCLAIMER,
  estimateBookingCosts,
  type BookingEstimateInput,
} from '@/lib/booking-price-estimate'
import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'

const grundCategory: BookingExtraCategory = {
  id: 'b2222222-2222-4222-b222-222222222222',
  name: 'Hundepension Grundpreise',
  description: null,
  service_type: 'hundepension',
  sort_order: 2,
}

const basePrice: BookingExtraPrice = {
  id: 'price-1',
  category_id: grundCategory.id,
  name: 'Standard Pension',
  description: null,
  price: 40,
  price_type: 'fixed',
  unit: 'Kalendertag',
  note: null,
  sort_order: 1,
  final_price: 40,
  catalog_price: 40,
}

function minimalInput(overrides: Partial<BookingEstimateInput>): BookingEstimateInput {
  return {
    pets: [{ id: 'pet-1', name: 'Bello' } as BookingEstimateInput['pets'][0]],
    petLines: [],
    dayCareOnceDates: {},
    dayCareRecurring: {},
    selectedExtrasByPet: {},
    prices: [basePrice],
    categories: [grundCategory],
    ...overrides,
  }
}

describe('estimateBookingCosts', () => {
  it('estimates hundepension by calendar days', () => {
    const result = estimateBookingCosts(
      minimalInput({
        petLines: [{ pet_id: 'pet-1', service_type: 'hundepension' }],
        dateRange: { from: new Date(2026, 6, 24), to: new Date(2026, 6, 26) },
      })
    )

    const charge = result.lines.find((l) => l.kind === 'charge')
    expect(charge?.quantity).toBe(3)
    expect(charge?.lineTotal).toBe(120)
    expect(result.total).toBe(120)
  })

  it('adds katzen note without charge', () => {
    const result = estimateBookingCosts(
      minimalInput({
        petLines: [{ pet_id: 'pet-1', service_type: 'katzenbetreuung' }],
      })
    )

    expect(result.lines.some((l) => l.kind === 'note' && l.label.includes('Katzenbetreuung'))).toBe(
      true
    )
    expect(result.lines.filter((l) => l.kind === 'charge')).toHaveLength(0)
    expect(result.total).toBeNull()
  })

  it('estimates tagesbetreuung once by selected days', () => {
    const result = estimateBookingCosts(
      minimalInput({
        petLines: [
          { pet_id: 'pet-1', service_type: 'tagesbetreuung', day_care_mode: 'once' },
        ],
        dayCareOnceDates: {
          'pet-1': [new Date(2026, 6, 24), new Date(2026, 6, 31)],
        },
      })
    )

    const charge = result.lines.find((l) => l.kind === 'charge')
    expect(charge?.quantity).toBe(2)
    expect(charge?.lineTotal).toBe(80)
  })

  it('recurring day care has no total sum', () => {
    const result = estimateBookingCosts(
      minimalInput({
        petLines: [
          { pet_id: 'pet-1', service_type: 'tagesbetreuung', day_care_mode: 'recurring' },
        ],
        dayCareRecurring: {
          'pet-1': { weekdays: [1, 3, 5], startDate: new Date(2026, 8, 1) },
        },
      })
    )

    expect(result.lines.some((l) => l.detail?.includes('kein Gesamtbetrag'))).toBe(true)
    expect(result.total).toBeNull()
  })

  it('includes fixed extra per pet in total', () => {
    const extraCat: BookingExtraCategory = {
      id: 'extra-cat',
      name: 'Hundepension Zusatzleistungen',
      description: null,
      service_type: 'hundepension',
      sort_order: 10,
    }
    const extraPrice: BookingExtraPrice = {
      id: 'extra-1',
      category_id: extraCat.id,
      name: 'Bad',
      description: null,
      price: 15,
      price_type: 'fixed',
      unit: null,
      note: null,
      sort_order: 1,
      final_price: 15,
      catalog_price: 15,
    }

    const result = estimateBookingCosts(
      minimalInput({
        petLines: [{ pet_id: 'pet-1', service_type: 'hundepension' }],
        dateRange: { from: new Date(2026, 6, 24), to: new Date(2026, 6, 24) },
        prices: [basePrice, extraPrice],
        categories: [grundCategory, extraCat],
        selectedExtrasByPet: { 'pet-1': { 'extra-1': 1 } },
      })
    )

    expect(result.total).toBe(55)
  })

  it('includes disclaimer', () => {
    const result = estimateBookingCosts(minimalInput({}))
    expect(result.disclaimer).toBe(BOOKING_ESTIMATE_DISCLAIMER)
  })
})
