export type PriceOverrideDiscountType = 'fixed' | 'percentage'

export interface PriceOverrideRow {
  price_id: string
  price: number | null
  discount_type?: PriceOverrideDiscountType | null
  discount_value?: number | null
}

export interface CatalogPriceRow {
  id: string
  price: number | null
  price_type: 'fixed' | 'percentage' | 'per_unit' | 'text'
}

export interface ResolvedPriceOverride {
  base_price: number | null
  base_source: 'catalog' | 'group' | 'individual'
  special_price: number | null
  special_price_source: 'group' | 'individual' | null
  discount_type: PriceOverrideDiscountType | null
  discount_value: number | null
  discount_source: 'group' | 'individual' | null
  discount_amount: number | null
  final_price: number | null
  is_override: boolean
  override_type: 'individual' | 'group' | null
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

export function resolvePriceOverride(
  catalog: CatalogPriceRow,
  groupOverride: PriceOverrideRow | null | undefined,
  customerOverride: PriceOverrideRow | null | undefined
): ResolvedPriceOverride {
  const catalogBase = catalogNumericBase(catalog)

  let basePrice = catalogBase
  let baseSource: ResolvedPriceOverride['base_source'] = 'catalog'
  let specialPrice: number | null = null
  let specialPriceSource: ResolvedPriceOverride['special_price_source'] = null

  if (groupOverride?.price != null && !Number.isNaN(groupOverride.price)) {
    basePrice = groupOverride.price
    baseSource = 'group'
    specialPrice = groupOverride.price
    specialPriceSource = 'group'
  }

  if (customerOverride?.price != null && !Number.isNaN(customerOverride.price)) {
    basePrice = customerOverride.price
    baseSource = 'individual'
    specialPrice = customerOverride.price
    specialPriceSource = 'individual'
  }

  let discountType: PriceOverrideDiscountType | null = null
  let discountValue: number | null = null
  let discountSource: ResolvedPriceOverride['discount_source'] = null

  if (
    groupOverride?.discount_type &&
    groupOverride.discount_value != null &&
    !Number.isNaN(groupOverride.discount_value)
  ) {
    discountType = groupOverride.discount_type
    discountValue = groupOverride.discount_value
    discountSource = 'group'
  }

  if (
    customerOverride?.discount_type &&
    customerOverride.discount_value != null &&
    !Number.isNaN(customerOverride.discount_value)
  ) {
    discountType = customerOverride.discount_type
    discountValue = customerOverride.discount_value
    discountSource = 'individual'
  }

  const hasDiscount = discountSource !== null

  let discountAmount: number | null = null
  let finalPrice = basePrice

  if (basePrice != null && discountType && discountValue != null) {
    const applied = applyDiscount(basePrice, discountType, discountValue)
    discountAmount = applied.discountAmount
    finalPrice = applied.finalPrice
  }

  const isOverride =
    specialPriceSource !== null || hasDiscount
  let overrideType: ResolvedPriceOverride['override_type'] = null
  if (isOverride) {
    overrideType =
      specialPriceSource === 'individual' || discountSource === 'individual'
        ? 'individual'
        : 'group'
  }

  return {
    base_price: basePrice,
    base_source: baseSource,
    special_price: specialPrice,
    special_price_source: specialPriceSource,
    discount_type: discountType,
    discount_value: discountValue,
    discount_source: discountSource,
    discount_amount: discountAmount,
    final_price: finalPrice,
    is_override: isOverride,
    override_type: overrideType,
  }
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
  if (!hasOverrideContent(override)) {
    return null
  }

  const price =
    override.price !== null &&
    override.price !== undefined &&
    override.price !== '' &&
    !Number.isNaN(Number(override.price))
      ? parseFloat(String(override.price))
      : null

  const discountType =
    override.discount_type === 'fixed' || override.discount_type === 'percentage'
      ? override.discount_type
      : null

  const discountValue =
    discountType &&
    override.discount_value !== null &&
    override.discount_value !== undefined &&
    override.discount_value !== '' &&
    !Number.isNaN(Number(override.discount_value))
      ? parseFloat(String(override.discount_value))
      : null

  if (price === null && (discountType === null || discountValue === null)) {
    return null
  }

  return {
    price_id: override.price_id,
    price,
    discount_type: discountType,
    discount_value: discountValue,
  }
}
