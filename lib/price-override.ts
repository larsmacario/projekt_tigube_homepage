import {
  normalizeRulePayload,
  type PriceOverrideDiscountType,
} from '@/lib/price-resolver'

export type {
  PriceOverrideDiscountType,
  PriceUsage,
  PriceRuleMode,
  PriceScopeType,
  PriceSource,
  CatalogPriceRow,
  PriceRuleRow,
  ResolvedPriceItem,
  PriceResolutionContext,
} from '@/lib/price-resolver'

export {
  resolveCatalogPrice,
  resolvePriceOverride,
  isPriceArchived,
  isBookableUsage,
  isBaseUsage,
  isSurchargeUsage,
  formatEuro,
  formatDiscountLabel,
  hasRuleContent,
  FIXED_PERCENTAGE_SURCHARGE_RATE,
} from '@/lib/price-resolver'

export interface PriceOverrideRow {
  price_id: string
  price: number | null
  discount_type?: PriceOverrideDiscountType | null
  discount_value?: number | null
}

export function hasOverrideContent(override: {
  price?: number | null | string
  discount_type?: PriceOverrideDiscountType | null | string
  discount_value?: number | null | string
}): boolean {
  const hasPrice =
    override.price !== null &&
    override.price !== undefined &&
    override.price !== '' &&
    !Number.isNaN(Number(override.price))

  const hasDiscount =
    override.discount_type &&
    override.discount_value !== null &&
    override.discount_value !== undefined &&
    override.discount_value !== '' &&
    !Number.isNaN(Number(override.discount_value))

  return Boolean(hasPrice || hasDiscount)
}

export function normalizeOverridePayload(override: {
  price_id: string
  price?: number | null | string
  discount_type?: PriceOverrideDiscountType | null | string
  discount_value?: number | null | string
}): PriceOverrideRow | null {
  const rule = normalizeRulePayload({
    price_id: override.price_id,
    rule_mode: 'custom',
    price: override.price,
    discount_type: override.discount_type,
    discount_value: override.discount_value,
  })
  if (!rule) return null
  return {
    price_id: rule.price_id,
    price: rule.price,
    discount_type: rule.discount_type,
    discount_value: rule.discount_value,
  }
}
