import { resolvePriceOverride, type CatalogPriceRow } from '@/lib/price-override'
import type { ServiceType } from '@/lib/types'

export interface BookingExtraCategory {
  id: string
  name: string
  description: string | null
  service_type: 'hundepension' | 'katzenbetreuung' | 'all'
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
  final_price: number | null
  catalog_price: number | null
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
  booking_id: null
  price_id: string | null
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

/** Maps booking service to price category service_type filter. */
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

export function isExtraServiceCategory(category: BookingExtraCategory): boolean {
  return category.name.toLowerCase().includes('zusatzleistungen')
}

export function filterExtraCategoriesForServices(
  categories: BookingExtraCategory[],
  serviceTypes: ServiceType[]
): BookingExtraCategory[] {
  const allowed = collectExtraCatalogServiceTypes(serviceTypes)
  return categories
    .filter(isExtraServiceCategory)
    .filter(
      (cat) =>
        cat.service_type === 'all' || allowed.includes(cat.service_type as ServiceType | 'all')
    )
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function filterBookableExtraPrices(
  prices: BookingExtraPrice[],
  categoryIds: Set<string>
): BookingExtraPrice[] {
  return prices
    .filter((p) => categoryIds.has(p.category_id))
    .filter((p) => p.price_type !== 'text')
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function resolveExtraPriceForCustomer(
  catalog: BookingExtraPrice,
  groupOverride: { price_id: string; price: number | null; discount_type?: string | null; discount_value?: number | null } | null,
  customerOverride: { price_id: string; price: number | null; discount_type?: string | null; discount_value?: number | null } | null
): number | null {
  const resolved = resolvePriceOverride(catalog, groupOverride, customerOverride)
  if (catalog.price_type === 'percentage') {
    return catalog.price
  }
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
    if (!price) {
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
  const extraCategories = filterExtraCategoriesForServices(categories, [serviceType])
  const categoryIds = new Set(extraCategories.map((c) => c.id))
  return filterBookableExtraPrices(prices, categoryIds)
}

export function uniqueServiceTypesFromPetLines(
  lines: Array<{ service_type: ServiceType }>
): ServiceType[] {
  return [...new Set(lines.map((l) => l.service_type))]
}
