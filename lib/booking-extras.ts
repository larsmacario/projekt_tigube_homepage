import { resolveCatalogPrice, type CatalogPriceRow, type PriceUsage } from '@/lib/price-resolver'
import { resolveCatalogPercentageRate } from '@/lib/price-catalog-policy'
import type { ServiceType } from '@/lib/types'

export interface BookingExtraCategory {
  id: string
  name: string
  description: string | null
  service_type: 'hundepension' | 'katzenbetreuung' | 'all'
  service_area_id?: string | null
  sort_order: number
}

export interface BookingExtraPrice extends CatalogPriceRow {
  id: string
  category_id: string
  name: string
  description: string | null
  unit: string | null
  note: string | null
  sort_order: number
  usage: PriceUsage
  final_price: number | null
  catalog_price: number | null
  applicable?: boolean
  rule_mode?: 'inherit' | 'custom' | 'not_applicable' | null
}

export interface BookingExtraSelection {
  price_id: string
  quantity?: number
  pet_id?: string
}

/** pet_id → price_id → quantity */
export type PetExtraSelections = Record<string, Record<string, number>>

export function flattenPetExtraSelections(
  petIds: string[],
  byPet: PetExtraSelections
): BookingExtraSelection[] {
  const items: BookingExtraSelection[] = []
  for (const petId of petIds) {
    const selections = byPet[petId]
    if (!selections) continue
    for (const [price_id, quantity] of Object.entries(selections)) {
      if (quantity > 0) {
        items.push({ price_id, quantity, pet_id: petId })
      }
    }
  }
  return items
}

export interface BookingLineItemInsert {
  request_group_id: string
  booking_id: null | string
  price_id: string | null
  addon_service_id?: string | null
  label: string
  description: string | null
  price_type: CatalogPriceRow['price_type']
  unit: string | null
  quantity: number
  unit_price: number | null
  line_total: number | null
  source: 'customer' | 'admin'
  created_by: string | null
}

export function serviceTypeForExtraCatalog(serviceType: ServiceType): ServiceType | 'all' {
  if (serviceType === 'tagesbetreuung') {
    return 'hundepension'
  }
  return serviceType
}

export function collectExtraCatalogServiceTypes(
  serviceTypes: ServiceType[]
): Array<ServiceType | 'all'> {
  const set = new Set<ServiceType | 'all'>()
  for (const st of serviceTypes) {
    set.add(serviceTypeForExtraCatalog(st))
  }
  return [...set]
}

export function categoryMatchesService(
  category: BookingExtraCategory,
  serviceTypes: ServiceType[]
): boolean {
  const allowed = collectExtraCatalogServiceTypes(serviceTypes)
  return category.service_type === 'all' || allowed.includes(category.service_type)
}

export function filterCategoriesForServices(
  categories: BookingExtraCategory[],
  serviceTypes: ServiceType[]
): BookingExtraCategory[] {
  return categories
    .filter((cat) => categoryMatchesService(cat, serviceTypes))
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function filterPricesByUsage(
  prices: BookingExtraPrice[],
  usage: PriceUsage
): BookingExtraPrice[] {
  return prices.filter((price) => price.usage === usage)
}

export function filterBookableExtraPrices(
  prices: BookingExtraPrice[],
  categoryIds: Set<string>
): BookingExtraPrice[] {
  return prices
    .filter((price) => categoryIds.has(price.category_id))
    .filter((price) => price.usage === 'extra')
    .filter((price) => price.price_type !== 'text')
    .filter((price) => price.applicable !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function filterApplicableBasePrices(
  prices: BookingExtraPrice[],
  categoryIds: Set<string>
): BookingExtraPrice[] {
  return prices
    .filter((price) => categoryIds.has(price.category_id))
    .filter((price) => price.usage === 'base')
    .filter((price) => price.applicable !== false)
    .filter((price) => (price.final_price ?? price.price) != null)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function resolveExtraPriceForCustomer(
  catalog: BookingExtraPrice
): number | null {
  if (catalog.price_type === 'percentage') {
    return resolveCatalogPercentageRate(catalog) ?? catalog.price
  }
  const resolved = resolveCatalogPrice(catalog)
  return resolved.final_price ?? catalog.price
}

export function computeLineItemSnapshot(
  price: BookingExtraPrice,
  quantity: number
): { unit_price: number | null; line_total: number | null; quantity: number } {
  const qty = Math.max(1, quantity)

  if (price.price_type === 'percentage') {
    return {
      quantity: 1,
      unit_price: price.final_price ?? price.catalog_price ?? price.price,
      line_total: null,
    }
  }

  const unitPrice = price.final_price ?? price.catalog_price ?? price.price
  if (unitPrice === null || Number.isNaN(unitPrice)) {
    return { quantity: qty, unit_price: null, line_total: null }
  }

  return {
    quantity: qty,
    unit_price: unitPrice,
    line_total: Math.round(unitPrice * qty * 100) / 100,
  }
}

export interface BuildCustomerLineItemsContext {
  bookingIdByPetId?: Map<string, string>
  petNameByPetId?: Map<string, string>
}

export function buildCustomerLineItemsFromSelections(
  requestGroupId: string,
  selections: BookingExtraSelection[],
  priceById: Map<string, BookingExtraPrice>,
  createdBy: string | null,
  context?: BuildCustomerLineItemsContext
): BookingLineItemInsert[] {
  const items: BookingLineItemInsert[] = []

  for (const selection of selections) {
    const price = priceById.get(selection.price_id)
    if (!price || price.applicable === false) {
      continue
    }

    const { quantity, unit_price, line_total } = computeLineItemSnapshot(
      price,
      selection.quantity ?? 1
    )

    const petName =
      selection.pet_id && context?.petNameByPetId
        ? context.petNameByPetId.get(selection.pet_id)
        : undefined
    const label = petName ? `${petName}: ${price.name}` : price.name
    const booking_id =
      selection.pet_id && context?.bookingIdByPetId
        ? context.bookingIdByPetId.get(selection.pet_id) ?? null
        : null

    items.push({
      request_group_id: requestGroupId,
      booking_id,
      price_id: price.id,
      addon_service_id: null,
      label,
      description: price.description,
      price_type: price.price_type,
      unit: price.unit,
      quantity,
      unit_price,
      line_total,
      source: 'customer',
      created_by: createdBy,
    })
  }

  return items
}

export function getBookableExtrasForService(
  prices: BookingExtraPrice[],
  categories: BookingExtraCategory[],
  serviceType: ServiceType
): BookingExtraPrice[] {
  const serviceCategories = filterCategoriesForServices(categories, [serviceType])
  const categoryIds = new Set(serviceCategories.map((category) => category.id))
  return filterBookableExtraPrices(prices, categoryIds)
}

export function uniqueServiceTypesFromPetLines(
  lines: Array<{ service_type: ServiceType }>
): ServiceType[] {
  return [...new Set(lines.map((line) => line.service_type))]
}

/** @deprecated Nutze filterBookableExtraPrices */
export function filterExtraCategoriesForServices(
  categories: BookingExtraCategory[],
  serviceTypes: ServiceType[]
): BookingExtraCategory[] {
  return filterCategoriesForServices(categories, serviceTypes).filter((category) =>
    category.name.toLowerCase().includes('zusatz')
  )
}

/** @deprecated Nutze filterPricesByUsage(..., 'extra') */
export function filterCustomerSelectableExtraPrices(
  prices: BookingExtraPrice[]
): BookingExtraPrice[] {
  return prices.filter((price) => price.usage === 'extra' && price.applicable !== false)
}

/** @deprecated */
export function isExtraServiceCategory(category: BookingExtraCategory): boolean {
  return category.name.toLowerCase().includes('zusatzleistungen')
}
