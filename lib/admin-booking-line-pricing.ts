import type { BookingLineItem } from '@/lib/types'

export type AdminLineDiscountType = 'none' | 'percentage' | 'fixed'

export function computeAdminBookingLineAmounts(
  quantity: number,
  unitPrice: number | null,
  priceType: BookingLineItem['price_type'],
  discountType: AdminLineDiscountType,
  discountValue: number | null
): {
  unit_price: number | null
  line_total: number | null
  discount_note: string | null
} {
  if (priceType === 'percentage') {
    return {
      unit_price: unitPrice,
      line_total: null,
      discount_note: null,
    }
  }

  if (unitPrice == null || Number.isNaN(unitPrice)) {
    return { unit_price: null, line_total: null, discount_note: null }
  }

  const qty = Math.max(1, quantity)
  const subtotal = Math.round(unitPrice * qty * 100) / 100

  if (discountType === 'none' || discountValue == null || discountValue <= 0) {
    return { unit_price: unitPrice, line_total: subtotal, discount_note: null }
  }

  let line_total: number
  let discount_note: string

  if (discountType === 'fixed') {
    const discountAmount = Math.min(discountValue, subtotal)
    line_total = Math.round((subtotal - discountAmount) * 100) / 100
    discount_note = `Admin-Rabatt ${formatDiscountEuro(discountAmount)}`
  } else {
    const discountAmount = (subtotal * discountValue) / 100
    line_total = Math.round(Math.max(0, subtotal - discountAmount) * 100) / 100
    discount_note = `Admin-Rabatt ${discountValue} %`
  }

  return { unit_price: unitPrice, line_total, discount_note }
}

function formatDiscountEuro(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} €`
}

export function mergeLineItemDescription(
  base: string | null | undefined,
  discountNote: string | null
): string | null {
  const parts = [base?.trim(), discountNote?.trim()].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}
