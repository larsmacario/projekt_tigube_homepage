import { describe, expect, it } from 'vitest'
import { resolveCatalogPrice } from '@/lib/price-resolver'

const catalog = {
  id: 'price-1',
  price: 35,
  price_type: 'fixed' as const,
  usage: 'base' as const,
}

describe('resolveCatalogPrice', () => {
  it('uses catalog price by default', () => {
    const result = resolveCatalogPrice(catalog, {})
    expect(result.final_price).toBe(35)
    expect(result.applicable).toBe(true)
    expect(result.base_source).toBe('catalog')
  })

  it('prefers customer over group over catalog', () => {
    const result = resolveCatalogPrice(catalog, {
      groupRule: {
        price_id: 'price-1',
        rule_mode: 'custom',
        price: 30,
        discount_type: null,
        discount_value: null,
      },
      customerRule: {
        price_id: 'price-1',
        rule_mode: 'custom',
        price: 28,
        discount_type: null,
        discount_value: null,
      },
    })
    expect(result.final_price).toBe(28)
    expect(result.base_source).toBe('customer')
  })

  it('uses pet custom price over customer', () => {
    const result = resolveCatalogPrice(catalog, {
      customerRule: {
        price_id: 'price-1',
        rule_mode: 'custom',
        price: 28,
        discount_type: null,
        discount_value: null,
      },
      petRule: {
        price_id: 'price-1',
        rule_mode: 'custom',
        price: 25,
        discount_type: null,
        discount_value: null,
      },
    })
    expect(result.final_price).toBe(25)
    expect(result.base_source).toBe('pet')
  })

  it('marks pet not_applicable as non-applicable', () => {
    const result = resolveCatalogPrice(catalog, {
      petRule: {
        price_id: 'price-1',
        rule_mode: 'not_applicable',
        price: null,
        discount_type: null,
        discount_value: null,
      },
    })
    expect(result.applicable).toBe(false)
    expect(result.final_price).toBeNull()
    expect(result.rule_mode).toBe('not_applicable')
    expect(result.override_type).toBe('pet')
  })

  it('marks group not_applicable as non-applicable when customer/pet have no override', () => {
    const result = resolveCatalogPrice(catalog, {
      groupRule: {
        price_id: 'price-1',
        rule_mode: 'not_applicable',
        price: null,
        discount_type: null,
        discount_value: null,
      },
    })
    expect(result.applicable).toBe(false)
    expect(result.final_price).toBeNull()
    expect(result.rule_mode).toBe('not_applicable')
    expect(result.override_type).toBe('group')
  })

  it('leaves standard catalog price unchanged when group price is removed', () => {
    const groupRemovedResult = resolveCatalogPrice(catalog, {
      groupRule: {
        price_id: 'price-1',
        rule_mode: 'not_applicable',
        price: null,
        discount_type: null,
        discount_value: null,
      },
    })
    const standardResult = resolveCatalogPrice(catalog, {})

    expect(groupRemovedResult.applicable).toBe(false)
    expect(standardResult.applicable).toBe(true)
    expect(standardResult.final_price).toBe(35)
    expect(standardResult.base_source).toBe('catalog')
  })

  it('allows customer custom rule to override group not_applicable', () => {
    const result = resolveCatalogPrice(catalog, {
      groupRule: {
        price_id: 'price-1',
        rule_mode: 'not_applicable',
        price: null,
        discount_type: null,
        discount_value: null,
      },
      customerRule: {
        price_id: 'price-1',
        rule_mode: 'custom',
        price: 26,
        discount_type: null,
        discount_value: null,
      },
    })
    expect(result.applicable).toBe(true)
    expect(result.final_price).toBe(26)
    expect(result.base_source).toBe('customer')
  })

  it('marks customer not_applicable as non-applicable even if group has custom price', () => {
    const result = resolveCatalogPrice(catalog, {
      groupRule: {
        price_id: 'price-1',
        rule_mode: 'custom',
        price: 20,
        discount_type: null,
        discount_value: null,
      },
      customerRule: {
        price_id: 'price-1',
        rule_mode: 'not_applicable',
        price: null,
        discount_type: null,
        discount_value: null,
      },
    })
    expect(result.applicable).toBe(false)
    expect(result.final_price).toBeNull()
    expect(result.rule_mode).toBe('not_applicable')
    expect(result.override_type).toBe('customer')
  })

  it('inherits from customer when pet rule is inherit', () => {
    const result = resolveCatalogPrice(catalog, {
      customerRule: {
        price_id: 'price-1',
        rule_mode: 'custom',
        price: 28,
        discount_type: null,
        discount_value: null,
      },
      petRule: {
        price_id: 'price-1',
        rule_mode: 'inherit',
        price: null,
        discount_type: null,
        discount_value: null,
      },
    })
    expect(result.final_price).toBe(28)
    expect(result.rule_mode).toBe('inherit')
  })

  it('does not stack discounts from multiple levels', () => {
    const result = resolveCatalogPrice(catalog, {
      groupRule: {
        price_id: 'price-1',
        rule_mode: 'custom',
        price: null,
        discount_type: 'percentage',
        discount_value: 10,
      },
      customerRule: {
        price_id: 'price-1',
        rule_mode: 'custom',
        price: null,
        discount_type: 'fixed',
        discount_value: 5,
      },
    })
    expect(result.final_price).toBe(30)
    expect(result.discount_source).toBe('customer')
  })
})
