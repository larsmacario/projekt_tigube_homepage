import { describe, expect, it } from 'vitest'

import {
  buildCustomerLineItemsFromSelections,
  collectExtraCatalogServiceTypes,
  computeLineItemSnapshot,
  filterBookableExtraPrices,
  filterExtraCategoriesForServices,
  isExtraServiceCategory,
  serviceTypeForExtraCatalog,
} from '@/lib/booking-extras'
import type { ServiceType } from '@/lib/types'

describe('booking-extras', () => {
  it('maps tagesbetreuung to hundepension for extra catalog', () => {
    expect(serviceTypeForExtraCatalog('tagesbetreuung')).toBe('hundepension')
    expect(collectExtraCatalogServiceTypes(['tagesbetreuung', 'katzenbetreuung'])).toEqual([
      'hundepension',
      'katzenbetreuung',
    ])
  })

  it('filters Zusatzleistungen categories by service', () => {
    const categories = [
      {
        id: '1',
        name: 'Hundepension Zusatzleistungen',
        description: null,
        service_type: 'hundepension' as const,
        sort_order: 1,
      },
      {
        id: '2',
        name: 'Katzenbetreuung Zusatzleistungen',
        description: null,
        service_type: 'katzenbetreuung' as const,
        sort_order: 2,
      },
      {
        id: '3',
        name: 'Hundepension Grundpreise',
        description: null,
        service_type: 'hundepension' as const,
        sort_order: 3,
      },
    ]

    expect(isExtraServiceCategory(categories[0])).toBe(true)
    expect(isExtraServiceCategory(categories[2])).toBe(false)

    const filtered = filterExtraCategoriesForServices(categories, ['hundepension'])
    expect(filtered.map((c) => c.id)).toEqual(['1'])
  })

  it('excludes text prices from bookable extras', () => {
    const prices = [
      {
        id: 'p1',
        category_id: '1',
        name: 'Medikament',
        description: null,
        price: 5,
        price_type: 'fixed' as const,
        unit: null,
        note: null,
        sort_order: 1,
        final_price: 5,
        catalog_price: 5,
      },
      {
        id: 'p2',
        category_id: '1',
        name: 'Hinweis',
        description: 'Text',
        price: null,
        price_type: 'text' as const,
        unit: null,
        note: null,
        sort_order: 2,
        final_price: null,
        catalog_price: null,
      },
    ]

    const result = filterBookableExtraPrices(prices, new Set(['1']))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
  })

  it('computes fixed and percentage line snapshots', () => {
    const fixed = computeLineItemSnapshot(
      {
        id: '1',
        category_id: 'c',
        name: 'X',
        description: null,
        price: 10,
        price_type: 'fixed',
        unit: null,
        note: null,
        sort_order: 1,
        final_price: 8,
        catalog_price: 10,
      },
      2
    )
    expect(fixed.unit_price).toBe(8)
    expect(fixed.line_total).toBe(16)

    const pct = computeLineItemSnapshot(
      {
        id: '2',
        category_id: 'c',
        name: 'Zuschlag',
        description: null,
        price: 50,
        price_type: 'percentage',
        unit: 'auf Tagespreis',
        note: null,
        sort_order: 1,
        final_price: 50,
        catalog_price: 50,
      },
      1
    )
    expect(pct.line_total).toBeNull()
    expect(pct.unit_price).toBe(50)
  })

  it('builds customer line items from selections', () => {
    const price = {
      id: 'p1',
      category_id: '1',
      name: 'Fahrt',
      description: null,
      price: 12,
      price_type: 'per_unit' as const,
      unit: 'km',
      note: null,
      sort_order: 1,
      final_price: 12,
      catalog_price: 12,
    }
    const map = new Map([[price.id, price]])
    const items = buildCustomerLineItemsFromSelections(
      'group-1',
      [{ price_id: 'p1', quantity: 3, pet_id: 'pet-a' }],
      map,
      'user-1',
      {
        petNameByPetId: new Map([['pet-a', 'Bello']]),
        bookingIdByPetId: new Map([['pet-a', 'booking-a']]),
      }
    )
    expect(items).toHaveLength(1)
    expect(items[0].line_total).toBe(36)
    expect(items[0].label).toBe('Bello: Fahrt')
    expect(items[0].booking_id).toBe('booking-a')
    expect(items[0].source).toBe('customer')
  })
})

describe('service types union', () => {
  it('accepts known service types', () => {
    const types: ServiceType[] = ['hundepension', 'katzenbetreuung', 'tagesbetreuung']
    expect(types).toHaveLength(3)
  })
})
