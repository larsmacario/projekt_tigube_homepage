import { describe, expect, it } from 'vitest'

import {
  BOOKING_ESTIMATE_DISCLAIMER,
  estimateBookingCosts,
  type BookingEstimateInput,
} from '@/lib/booking-price-estimate'
import {
  BRING_HOLZEITEN_CATEGORY_ID,
  OUT_OF_HOURS_PICKUP_PRICE_ID,
} from '@/lib/pickup-time-surcharge'
import { DEFAULT_OVERNIGHT_FEE } from '@/lib/overnight-surcharge'
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
  usage: 'base',
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

    const pensionCharge = result.lines.find(
      (l) => l.kind === 'charge' && l.label.includes('Standard Pension')
    )
    expect(pensionCharge?.quantity).toBe(3)
    expect(pensionCharge?.lineTotal).toBe(120)

    const weekendCharge = result.lines.find(
      (l) => l.kind === 'charge' && l.label.includes('Sonn- und Feiertagszuschlag')
    )
    expect(weekendCharge?.quantity).toBe(2)
    expect(weekendCharge?.lineTotal).toBe(40)
    expect(result.total).toBe(160)
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
      usage: 'extra',
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

  it('adds pickup surcharge and overnight for late pickup after 20:00', () => {
    const bringHolCategory: BookingExtraCategory = {
      id: BRING_HOLZEITEN_CATEGORY_ID,
      name: 'Hundepension Bring- und Holzeiten',
      description: null,
      service_type: 'hundepension',
      sort_order: 5,
    }
    const pickupSurcharge: BookingExtraPrice = {
      id: OUT_OF_HOURS_PICKUP_PRICE_ID,
      category_id: bringHolCategory.id,
      name: 'Bring-/Holzeit außerhalb Standardzeit',
      description: null,
      price: 8,
      price_type: 'fixed',
      unit: 'pro Termin',
      note: null,
      sort_order: 1,
      usage: 'surcharge',
      final_price: 8,
      catalog_price: 8,
    }
    const extrasCategory: BookingExtraCategory = {
      id: 'c3333333-3333-4333-c333-333333333333',
      name: 'Hundepension Zusatzleistungen',
      description: null,
      service_type: 'hundepension',
      sort_order: 3,
    }
    const overnightPrice: BookingExtraPrice = {
      id: 'overnight-1',
      category_id: extrasCategory.id,
      name: 'Übernachtung',
      description: null,
      price: 10,
      price_type: 'fixed',
      unit: 'je Nacht',
      note: null,
      sort_order: 1,
      usage: 'extra',
      final_price: 10,
      catalog_price: 10,
    }

    const result = estimateBookingCosts(
      minimalInput({
        petLines: [{ pet_id: 'pet-1', service_type: 'hundepension' }],
        dateRange: { from: new Date(2026, 6, 27), to: new Date(2026, 6, 31) },
        dropOffTime: '07:00',
        pickUpTime: '21:00',
        prices: [basePrice, pickupSurcharge, overnightPrice],
        categories: [grundCategory, bringHolCategory, extrasCategory],
      })
    )

    expect(
      result.lines.some(
        (l) => l.kind === 'charge' && l.label.includes('Abholen außerhalb Standardzeit')
      )
    ).toBe(true)
    expect(
      result.lines.some((l) => l.kind === 'charge' && l.label.includes('Übernachtung'))
    ).toBe(true)

    const pensionTotal = 5 * 40
    const pickupTotal = 8
    const overnightTotal = 10
    expect(result.total).toBe(pensionTotal + pickupTotal + overnightTotal)
  })

  it('adds pickup surcharge at 19:00 without overnight', () => {
    const bringHolCategory: BookingExtraCategory = {
      id: BRING_HOLZEITEN_CATEGORY_ID,
      name: 'Hundepension Bring- und Holzeiten',
      description: null,
      service_type: 'hundepension',
      sort_order: 5,
    }
    const pickupSurcharge: BookingExtraPrice = {
      id: OUT_OF_HOURS_PICKUP_PRICE_ID,
      category_id: bringHolCategory.id,
      name: 'Bring-/Holzeit außerhalb Standardzeit',
      description: null,
      price: 8,
      price_type: 'fixed',
      unit: 'pro Termin',
      note: null,
      sort_order: 1,
      usage: 'surcharge',
      final_price: 8,
      catalog_price: 8,
    }

    const result = estimateBookingCosts(
      minimalInput({
        petLines: [{ pet_id: 'pet-1', service_type: 'hundepension' }],
        dateRange: { from: new Date(2026, 6, 27), to: new Date(2026, 6, 27) },
        dropOffTime: '07:00',
        pickUpTime: '19:00',
        prices: [basePrice, pickupSurcharge],
        categories: [grundCategory, bringHolCategory],
      })
    )

    expect(
      result.lines.some(
        (l) => l.kind === 'charge' && l.label.includes('Abholen außerhalb Standardzeit')
      )
    ).toBe(true)
    expect(result.lines.some((l) => l.label.includes('Übernachtung'))).toBe(false)
    expect(result.total).toBe(40 + 8)
  })

  it('uses default overnight fee when catalog price missing', () => {
    const result = estimateBookingCosts(
      minimalInput({
        petLines: [{ pet_id: 'pet-1', service_type: 'hundepension' }],
        dateRange: { from: new Date(2026, 6, 27), to: new Date(2026, 6, 27) },
        dropOffTime: '07:00',
        pickUpTime: '21:00',
        prices: [basePrice],
        categories: [grundCategory],
      })
    )

    const overnight = result.lines.find(
      (l) => l.kind === 'charge' && l.label.includes('Übernachtung')
    )
    expect(overnight?.lineTotal).toBe(DEFAULT_OVERNIGHT_FEE)
    expect(result.total).toBe(40 + DEFAULT_OVERNIGHT_FEE + 8)
  })
})
