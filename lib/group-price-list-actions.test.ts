import { describe, expect, it } from 'vitest'

import {
  buildDuplicateGroupName,
  computePromoteCatalogUpdates,
} from '@/lib/group-price-list-actions'
import type { CatalogPriceRecord } from '@/lib/price-catalog-loader'
import type { PriceRuleRow } from '@/lib/price-resolver'

function catalogPrice(
  overrides: Partial<CatalogPriceRecord> & Pick<CatalogPriceRecord, 'id'>
): CatalogPriceRecord {
  return {
    category_id: 'cat-1',
    name: 'Tagespreis',
    description: null,
    price: 35,
    price_type: 'fixed',
    unit: 'pro Tag',
    note: null,
    sort_order: 0,
    usage: 'base',
    archived_at: null,
    sevdesk_article_id: null,
    ...overrides,
  }
}

describe('buildDuplicateGroupName', () => {
  it('hängt (Kopie) an, wenn der Name frei ist', () => {
    expect(buildDuplicateGroupName('Premium', ['Standard'])).toBe('Premium (Kopie)')
  })

  it('nummeriert Kollisionen hoch', () => {
    expect(
      buildDuplicateGroupName('Premium', ['Premium (Kopie)', 'Premium (Kopie 2)'])
    ).toBe('Premium (Kopie 3)')
  })
})

describe('computePromoteCatalogUpdates', () => {
  it('übernimmt custom-Gruppenpreis als Katalog-Endpreis', () => {
    const prices = [catalogPrice({ id: 'p1', price: 35 })]
    const rules: PriceRuleRow[] = [
      {
        price_id: 'p1',
        rule_mode: 'custom',
        price: 28,
        discount_type: null,
        discount_value: null,
      },
    ]

    const result = computePromoteCatalogUpdates(prices, rules)

    expect(result.updatedCount).toBe(1)
    expect(result.archivedCount).toBe(0)
    expect(result.updates).toEqual([{ priceId: 'p1', kind: 'update', price: 28 }])
  })

  it('archiviert not_applicable-Posten', () => {
    const prices = [catalogPrice({ id: 'p1' })]
    const rules: PriceRuleRow[] = [
      {
        price_id: 'p1',
        rule_mode: 'not_applicable',
        price: null,
        discount_type: null,
        discount_value: null,
      },
    ]

    const result = computePromoteCatalogUpdates(prices, rules)

    expect(result.updatedCount).toBe(0)
    expect(result.archivedCount).toBe(1)
    expect(result.updates).toEqual([{ priceId: 'p1', kind: 'archive' }])
  })

  it('lässt geerbte Preise unverändert', () => {
    const prices = [catalogPrice({ id: 'p1', price: 35 })]
    const result = computePromoteCatalogUpdates(prices, [])

    expect(result.updatedCount).toBe(0)
    expect(result.archivedCount).toBe(0)
    expect(result.updates).toEqual([{ priceId: 'p1', kind: 'skip' }])
  })

  it('überspringt feste Prozent- und Text-Preise', () => {
    const prices = [
      catalogPrice({ id: 'pct', price: 50, price_type: 'percentage' }),
      catalogPrice({ id: 'txt', price: null, price_type: 'text', usage: 'info' }),
    ]
    const rules: PriceRuleRow[] = [
      {
        price_id: 'pct',
        rule_mode: 'custom',
        price: 40,
        discount_type: null,
        discount_value: null,
      },
      {
        price_id: 'txt',
        rule_mode: 'custom',
        price: 10,
        discount_type: null,
        discount_value: null,
      },
    ]

    const result = computePromoteCatalogUpdates(prices, rules)

    expect(result.updatedCount).toBe(0)
    expect(result.archivedCount).toBe(0)
    expect(result.updates).toEqual([
      { priceId: 'pct', kind: 'skip' },
      { priceId: 'txt', kind: 'skip' },
    ])
  })

  it('kalkuliert Rabatte in den Endpreis ein', () => {
    const prices = [catalogPrice({ id: 'p1', price: 40 })]
    const rules: PriceRuleRow[] = [
      {
        price_id: 'p1',
        rule_mode: 'custom',
        price: null,
        discount_type: 'fixed',
        discount_value: 5,
      },
    ]

    const result = computePromoteCatalogUpdates(prices, rules)

    expect(result.updatedCount).toBe(1)
    expect(result.updates).toEqual([{ priceId: 'p1', kind: 'update', price: 35 }])
  })
})
