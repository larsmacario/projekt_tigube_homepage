import { describe, expect, it } from 'vitest'

import {
  computeAdminBookingLineAmounts,
  mergeLineItemDescription,
} from '@/lib/admin-booking-line-pricing'

describe('admin-booking-line-pricing', () => {
  it('computes subtotal without discount', () => {
    const result = computeAdminBookingLineAmounts(2, 10, 'fixed', 'none', null)
    expect(result).toEqual({
      unit_price: 10,
      line_total: 20,
      discount_note: null,
    })
  })

  it('applies percentage discount on line total', () => {
    const result = computeAdminBookingLineAmounts(2, 10, 'per_unit', 'percentage', 10)
    expect(result.line_total).toBe(18)
    expect(result.discount_note).toBe('Admin-Rabatt 10 %')
  })

  it('applies fixed euro discount capped at subtotal', () => {
    const result = computeAdminBookingLineAmounts(1, 5, 'fixed', 'fixed', 20)
    expect(result.line_total).toBe(0)
  })

  it('merges description with discount note', () => {
    expect(mergeLineItemDescription('Hinweis', 'Admin-Rabatt 5 %')).toBe(
      'Hinweis · Admin-Rabatt 5 %'
    )
  })
})
