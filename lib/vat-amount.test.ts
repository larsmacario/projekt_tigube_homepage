import { describe, expect, it } from 'vitest'

import {
  computeGrossFromNet,
  computeNetFromGross,
  DEFAULT_VAT_RATE,
  formatNetGrossInline,
  getNetGrossAmounts,
} from '@/lib/vat-amount'

describe('vat-amount', () => {
  it('computeGrossFromNet applies 19% VAT rounded to cents', () => {
    expect(computeGrossFromNet(0)).toBe(0)
    expect(computeGrossFromNet(1, DEFAULT_VAT_RATE)).toBe(1.19)
    expect(computeGrossFromNet(1.5, DEFAULT_VAT_RATE)).toBe(1.79)
    expect(computeGrossFromNet(12.5, DEFAULT_VAT_RATE)).toBe(14.88)
  })

  it('getNetGrossAmounts returns net and gross pair', () => {
    expect(getNetGrossAmounts(12.5)).toEqual({ net: 12.5, gross: 14.88 })
  })

  it('computeNetFromGross inverts gross calculation', () => {
    expect(computeNetFromGross(14.88, DEFAULT_VAT_RATE)).toBe(12.5)
    expect(computeGrossFromNet(computeNetFromGross(17.26, DEFAULT_VAT_RATE), DEFAULT_VAT_RATE)).toBe(
      17.26
    )
  })

  it('formatNetGrossInline shows gross first with net in parentheses', () => {
    const label = formatNetGrossInline(12.5)
    expect(label).toContain('14,88')
    expect(label).toContain('12,50')
    expect(label).toContain('netto')
  })
})
