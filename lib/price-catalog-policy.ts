import type { CatalogPriceRow } from '@/lib/price-override'

export const FIXED_PERCENTAGE_SURCHARGE_RATE = 50

export function isFixedPercentageCatalogPrice(catalog: Pick<CatalogPriceRow, 'price_type'>): boolean {
  return catalog.price_type === 'percentage'
}

/** Feste Katalog-Posten (z. B. 50‑%-Zuschlag) – nicht individuell überschreibbar. */
export function isOverridableCatalogPrice(
  catalog: Pick<CatalogPriceRow, 'price_type'>
): boolean {
  return catalog.price_type !== 'text' && !isFixedPercentageCatalogPrice(catalog)
}

/** Prozent aus Katalog – keine Gruppen-/Kunden-Overrides auf den %-Satz. */
export function resolveCatalogPercentageRate(
  catalog: Pick<CatalogPriceRow, 'price_type' | 'price'>
): number | null {
  if (catalog.price_type !== 'percentage') return null
  if (catalog.price == null || Number.isNaN(catalog.price)) return FIXED_PERCENTAGE_SURCHARGE_RATE
  return catalog.price
}

export function formatFixedPercentageLabel(rate: number): string {
  return `+${rate} % vom Tagespreis`
}
