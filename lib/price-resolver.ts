import {
  FIXED_PERCENTAGE_SURCHARGE_RATE,
  isFixedPercentageCatalogPrice,
  resolveCatalogPercentageRate,
} from '@/lib/price-catalog-policy'

export type PriceOverrideDiscountType = 'fixed' | 'percentage'
export type PriceUsage = 'base' | 'extra' | 'surcharge' | 'info'
export type PriceRuleMode = 'inherit' | 'custom' | 'not_applicable'
export type PriceScopeType = 'group' | 'customer' | 'pet'
export type PriceSource = 'catalog' | 'group' | 'customer' | 'pet'

export interface CatalogPriceRow {
  id: string
  price: number | null
  price_type: 'fixed' | 'percentage' | 'per_unit' | 'text'
  usage?: PriceUsage
  archived_at?: string | null
}

export interface PriceRuleRow {
  price_id: string
  rule_mode: PriceRuleMode
  price: number | null
  discount_type?: PriceOverrideDiscountType | null
  discount_value?: number | null
}

export interface ResolvedPriceItem {
  price_id: string
  applicable: boolean
  rule_mode: PriceRuleMode | null
  catalog_price: number | null
  base_price: number | null
  base_source: PriceSource
  special_price: number | null
  special_price_source: PriceSource | null
  discount_type: PriceOverrideDiscountType | null
  discount_value: number | null
  discount_source: PriceSource | null
  discount_amount: number | null
  final_price: number | null
  is_override: boolean
  override_type: PriceScopeType | null
}

export interface PriceResolutionContext {
  groupRule?: PriceRuleRow | null
  customerRule?: PriceRuleRow | null
  petRule?: PriceRuleRow | null
}

function catalogNumericBase(catalog: CatalogPriceRow): number | null {
  if (catalog.price_type === 'text' || catalog.price === null) {
    return null
  }
  return catalog.price
}

function applyDiscount(
  base: number,
  discountType: PriceOverrideDiscountType,
  discountValue: number
): { discountAmount: number; finalPrice: number } {
  if (discountType === 'fixed') {
    const discountAmount = Math.min(discountValue, base)
    return { discountAmount, finalPrice: Math.max(0, base - discountAmount) }
  }
  const discountAmount = (base * discountValue) / 100
  return { discountAmount, finalPrice: Math.max(0, base - discountAmount) }
}

function applyCustomRule(
  catalog: CatalogPriceRow,
  rule: PriceRuleRow,
  source: PriceSource
): Omit<ResolvedPriceItem, 'price_id' | 'applicable' | 'rule_mode'> {
  let basePrice = catalogNumericBase(catalog)
  let specialPrice: number | null = null
  let specialPriceSource: PriceSource | null = null

  if (rule.price != null && !Number.isNaN(rule.price)) {
    basePrice = rule.price
    specialPrice = rule.price
    specialPriceSource = source
  }

  let discountType: PriceOverrideDiscountType | null = null
  let discountValue: number | null = null
  let discountSource: PriceSource | null = null

  if (
    rule.discount_type &&
    rule.discount_value != null &&
    !Number.isNaN(rule.discount_value)
  ) {
    discountType = rule.discount_type
    discountValue = rule.discount_value
    discountSource = source
  }

  let discountAmount: number | null = null
  let finalPrice = basePrice

  if (basePrice != null && discountType && discountValue != null) {
    const applied = applyDiscount(basePrice, discountType, discountValue)
    discountAmount = applied.discountAmount
    finalPrice = applied.finalPrice
  }

  const isOverride = specialPriceSource !== null || discountSource !== null

  return {
    catalog_price: catalog.price,
    base_price: basePrice,
    base_source: specialPriceSource ?? 'catalog',
    special_price: specialPrice,
    special_price_source: specialPriceSource,
    discount_type: discountType,
    discount_value: discountValue,
    discount_source: discountSource,
    discount_amount: discountAmount,
    final_price: finalPrice,
    is_override: isOverride,
    override_type: isOverride ? (source === 'group' ? 'group' : source === 'customer' ? 'customer' : 'pet') : null,
  }
}

function resolveInheritedChain(
  catalog: CatalogPriceRow,
  context: PriceResolutionContext
): Omit<ResolvedPriceItem, 'price_id' | 'applicable' | 'rule_mode'> {
  if (context.customerRule?.rule_mode === 'custom') {
    return applyCustomRule(catalog, context.customerRule, 'customer')
  }
  if (context.groupRule?.rule_mode === 'custom') {
    return applyCustomRule(catalog, context.groupRule, 'group')
  }

  const catalogBase = catalogNumericBase(catalog)
  return {
    catalog_price: catalog.price,
    base_price: catalogBase,
    base_source: 'catalog',
    special_price: null,
    special_price_source: null,
    discount_type: null,
    discount_value: null,
    discount_source: null,
    discount_amount: null,
    final_price: catalogBase,
    is_override: false,
    override_type: null,
  }
}

export function resolveCatalogPrice(
  catalog: CatalogPriceRow,
  context: PriceResolutionContext = {}
): ResolvedPriceItem {
  if (isFixedPercentageCatalogPrice(catalog)) {
    const rate = resolveCatalogPercentageRate(catalog)
    return {
      price_id: catalog.id,
      applicable: catalog.usage !== 'info',
      rule_mode: null,
      catalog_price: catalog.price,
      base_price: catalog.price,
      base_source: 'catalog',
      special_price: null,
      special_price_source: null,
      discount_type: null,
      discount_value: null,
      discount_source: null,
      discount_amount: null,
      final_price: rate,
      is_override: false,
      override_type: null,
    }
  }

  const petRule = context.petRule

  if (petRule?.rule_mode === 'not_applicable') {
    return {
      price_id: catalog.id,
      applicable: false,
      rule_mode: 'not_applicable',
      catalog_price: catalog.price,
      base_price: null,
      base_source: 'catalog',
      special_price: null,
      special_price_source: null,
      discount_type: null,
      discount_value: null,
      discount_source: null,
      discount_amount: null,
      final_price: null,
      is_override: true,
      override_type: 'pet',
    }
  }

  if (petRule?.rule_mode === 'custom') {
    const resolved = applyCustomRule(catalog, petRule, 'pet')
    return {
      price_id: catalog.id,
      applicable: resolved.final_price != null,
      rule_mode: 'custom',
      ...resolved,
    }
  }

  const inherited = resolveInheritedChain(catalog, context)
  return {
    price_id: catalog.id,
    applicable: inherited.final_price != null || catalog.price_type === 'text',
    rule_mode: petRule?.rule_mode ?? 'inherit',
    ...inherited,
  }
}

export function isPriceArchived(catalog: Pick<CatalogPriceRow, 'archived_at'>): boolean {
  return catalog.archived_at != null
}

export function isBookableUsage(usage: PriceUsage | undefined): boolean {
  return usage === 'extra'
}

export function isBaseUsage(usage: PriceUsage | undefined): boolean {
  return usage === 'base'
}

export function isSurchargeUsage(usage: PriceUsage | undefined): boolean {
  return usage === 'surcharge'
}

export function formatEuro(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')}€`
}

export function formatDiscountLabel(
  discountType: PriceOverrideDiscountType,
  discountValue: number
): string {
  if (discountType === 'percentage') {
    return `−${discountValue}%`
  }
  return `−${formatEuro(discountValue)}`
}

export function hasRuleContent(rule: {
  rule_mode?: PriceRuleMode | null
  price?: number | null | string
  discount_type?: PriceOverrideDiscountType | null | string
  discount_value?: number | null | string
}): boolean {
  if (rule.rule_mode === 'not_applicable' || rule.rule_mode === 'inherit') {
    return true
  }

  const hasPrice =
    rule.price !== null &&
    rule.price !== undefined &&
    rule.price !== '' &&
    !Number.isNaN(Number(rule.price))

  const hasDiscount =
    (rule.discount_type === 'fixed' || rule.discount_type === 'percentage') &&
    rule.discount_value !== null &&
    rule.discount_value !== undefined &&
    rule.discount_value !== '' &&
    !Number.isNaN(Number(rule.discount_value))

  return Boolean(hasPrice || hasDiscount)
}

export function normalizeRulePayload(rule: {
  price_id: string
  rule_mode?: PriceRuleMode | null | string
  price?: number | null | string
  discount_type?: PriceOverrideDiscountType | null | string
  discount_value?: number | null | string
}): PriceRuleRow | null {
  const ruleMode =
    rule.rule_mode === 'inherit' ||
    rule.rule_mode === 'custom' ||
    rule.rule_mode === 'not_applicable'
      ? rule.rule_mode
      : 'custom'

  if (ruleMode === 'inherit' || ruleMode === 'not_applicable') {
    return {
      price_id: rule.price_id,
      rule_mode: ruleMode,
      price: null,
      discount_type: null,
      discount_value: null,
    }
  }

  const price =
    rule.price !== null &&
    rule.price !== undefined &&
    rule.price !== '' &&
    !Number.isNaN(Number(rule.price))
      ? parseFloat(String(rule.price))
      : null

  const discountType =
    rule.discount_type === 'fixed' || rule.discount_type === 'percentage'
      ? rule.discount_type
      : null

  const discountValue =
    discountType &&
    rule.discount_value !== null &&
    rule.discount_value !== undefined &&
    rule.discount_value !== '' &&
    !Number.isNaN(Number(rule.discount_value))
      ? parseFloat(String(rule.discount_value))
      : null

  if (price === null && (discountType === null || discountValue === null)) {
    return null
  }

  return {
    price_id: rule.price_id,
    rule_mode: 'custom',
    price,
    discount_type: discountType,
    discount_value: discountValue,
  }
}

/** @deprecated Use resolveCatalogPrice */
export function resolvePriceOverride(
  catalog: CatalogPriceRow,
  groupOverride: { price_id: string; price: number | null; discount_type?: PriceOverrideDiscountType | null; discount_value?: number | null } | null | undefined,
  customerOverride: { price_id: string; price: number | null; discount_type?: PriceOverrideDiscountType | null; discount_value?: number | null } | null | undefined
) {
  const toRule = (
    row: typeof groupOverride,
    mode: PriceRuleMode = 'custom'
  ): PriceRuleRow | null => {
    if (!row) return null
    return {
      price_id: row.price_id,
      rule_mode: mode,
      price: row.price,
      discount_type: row.discount_type ?? null,
      discount_value: row.discount_value ?? null,
    }
  }

  const resolved = resolveCatalogPrice(catalog, {
    groupRule: toRule(groupOverride),
    customerRule: toRule(customerOverride),
  })

  return {
    base_price: resolved.base_price,
    base_source: resolved.base_source,
    special_price: resolved.special_price,
    special_price_source: resolved.special_price_source,
    discount_type: resolved.discount_type,
    discount_value: resolved.discount_value,
    discount_source: resolved.discount_source,
    discount_amount: resolved.discount_amount,
    final_price: resolved.final_price,
    is_override: resolved.is_override,
    override_type: resolved.override_type === 'pet' ? null : resolved.override_type,
  }
}

export { FIXED_PERCENTAGE_SURCHARGE_RATE }
