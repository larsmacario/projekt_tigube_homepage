import { describe, expect, it } from 'vitest'

import {
  BRING_HOLZEITEN_CATEGORY_ID,
  OUT_OF_HOURS_PICKUP_PRICE_ID,
  evaluatePickupTimeOnDate,
  findOutOfHoursPickupCatalogPrice,
  isValidTimeHHmm,
  needsOutOfHoursPickupFee,
  resolveOutOfHoursPickupUnitPrice,
} from '@/lib/pickup-time-surcharge'
import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'

describe('pickup-time-surcharge', () => {
  it('validates HH:mm', () => {
    expect(isValidTimeHHmm('07:30')).toBe(true)
    expect(isValidTimeHHmm('25:00')).toBe(false)
  })

  it('accepts weekday morning window', () => {
    const evalResult = evaluatePickupTimeOnDate('2026-07-27', '07:30', new Set())
    expect(evalResult.withinStandardWindow).toBe(true)
    expect(needsOutOfHoursPickupFee(evalResult)).toBe(false)
  })

  it('midday weekday is note not auto fee', () => {
    const evalResult = evaluatePickupTimeOnDate('2026-07-27', '13:00', new Set())
    expect(evalResult.middayAppointmentNote).toBe(true)
    expect(needsOutOfHoursPickupFee(evalResult)).toBe(false)
  })

  it('weekend outside window triggers fee', () => {
    const evalResult = evaluatePickupTimeOnDate('2026-07-25', '11:00', new Set())
    expect(needsOutOfHoursPickupFee(evalResult)).toBe(true)
  })

  it('prefers usage=surcharge in Bring-/Hol-Kategorie', () => {
    const categories: BookingExtraCategory[] = [
      {
        id: BRING_HOLZEITEN_CATEGORY_ID,
        name: 'Hundepension Bring- und Holzeiten',
        description: null,
        service_type: 'hundepension',
        sort_order: 1,
      },
    ]

    const prices: BookingExtraPrice[] = [
      {
        id: 'info-1',
        category_id: BRING_HOLZEITEN_CATEGORY_ID,
        name: 'Standardfenster Mo–Fr',
        description: null,
        unit: null,
        note: null,
        sort_order: 1,
        usage: 'info',
        price: 0,
        price_type: 'text',
        final_price: null,
        catalog_price: null,
      },
      {
        id: OUT_OF_HOURS_PICKUP_PRICE_ID,
        category_id: BRING_HOLZEITEN_CATEGORY_ID,
        name: 'Bring-/Holzeit außerhalb Standardzeit',
        description: null,
        unit: 'pro Termin',
        note: null,
        sort_order: 2,
        usage: 'surcharge',
        price: 10,
        price_type: 'fixed',
        final_price: 10,
        catalog_price: 10,
      },
    ]

    expect(findOutOfHoursPickupCatalogPrice(prices, categories)?.id).toBe(
      OUT_OF_HOURS_PICKUP_PRICE_ID
    )
    expect(resolveOutOfHoursPickupUnitPrice(prices, categories)).toBe(10)
  })
})
