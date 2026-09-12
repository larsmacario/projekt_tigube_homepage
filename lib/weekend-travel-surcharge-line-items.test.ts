import { describe, expect, it } from 'vitest'

import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'
import { buildWeekendTravelSurchargeLineItems } from '@/lib/weekend-travel-surcharge-line-items'

describe('buildWeekendTravelSurchargeLineItems', () => {
  it('creates line item when pickup is on Sunday', () => {
    const category: BookingExtraCategory = {
      id: 'cat-1',
      name: 'Bring- und Holzeiten',
      description: null,
      service_type: 'hundepension',
      sort_order: 1,
    }
    const price: BookingExtraPrice = {
      id: 'price-travel',
      category_id: category.id,
      name: 'An- und Abreise an Sonn- und Feiertagen',
      description: null,
      price: 19,
      price_type: 'fixed',
      unit: 'pauschal',
      note: null,
      sort_order: 1,
      usage: 'surcharge',
      final_price: 19,
      catalog_price: 19,
    }

    const items = buildWeekendTravelSurchargeLineItems({
      requestGroupId: 'group-1',
      pickupSpan: { start: '2026-10-01', end: '2026-10-11' },
      publicHolidays: [],
      prices: [price],
      categories: [category],
      createdBy: 'user-1',
    })

    expect(items).toHaveLength(1)
    expect(items[0].unit_price).toBe(19)
    expect(items[0].line_total).toBe(19)
    expect(items[0].price_id).toBe('price-travel')
  })
})
