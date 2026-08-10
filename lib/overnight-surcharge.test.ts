import { describe, expect, it } from 'vitest'

import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'
import {
  DEFAULT_OVERNIGHT_FEE,
  findOvernightCatalogPrice,
  HUNDEPENSION_EXTRAS_CATEGORY_ID,
  needsOvernightOnLastDay,
  resolveOvernightUnitPrice,
} from '@/lib/overnight-surcharge'

const extrasCategory: BookingExtraCategory = {
  id: HUNDEPENSION_EXTRAS_CATEGORY_ID,
  name: 'Hundepension Zusatzleistungen',
  description: null,
  service_type: 'hundepension',
  sort_order: 3,
}

describe('overnight-surcharge', () => {
  it('requires pickup strictly after 20:00', () => {
    expect(needsOvernightOnLastDay('20:00')).toBe(false)
    expect(needsOvernightOnLastDay('20:01')).toBe(true)
    expect(needsOvernightOnLastDay('21:00')).toBe(true)
    expect(needsOvernightOnLastDay('19:59')).toBe(false)
  })

  it('finds overnight price in extras category', () => {
    const overnightPrice: BookingExtraPrice = {
      id: 'overnight-1',
      category_id: extrasCategory.id,
      name: 'Übernachtung',
      description: null,
      unit: 'je Nacht',
      note: null,
      sort_order: 1,
      usage: 'extra',
      price: 12,
      price_type: 'fixed',
      final_price: 12,
      catalog_price: 12,
    }

    const found = findOvernightCatalogPrice([overnightPrice], [extrasCategory])
    expect(found?.id).toBe('overnight-1')
    expect(resolveOvernightUnitPrice([overnightPrice], [extrasCategory])).toBe(12)
  })

  it('falls back to default fee when no catalog price', () => {
    expect(findOvernightCatalogPrice([], [extrasCategory])).toBeNull()
    expect(resolveOvernightUnitPrice([], [extrasCategory])).toBe(DEFAULT_OVERNIGHT_FEE)
  })
})
