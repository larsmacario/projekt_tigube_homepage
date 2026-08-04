import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildCustomerLineItemsFromSelections,
  filterBookableExtraPrices,
  filterCategoriesForServices,
  type BookingExtraCategory,
  type BookingExtraPrice,
  type BookingExtraSelection,
  type BuildCustomerLineItemsContext,
} from '@/lib/booking-extras'
import { loadResolvedPriceCatalog } from '@/lib/price-catalog-loader'
import type { ServiceType } from '@/lib/types'

export async function loadBookingExtraCatalogForCustomer(
  supabase: SupabaseClient,
  customerId: string,
  customerGroupId: string | null,
  serviceTypes: ServiceType[],
  petId?: string | null
): Promise<{ categories: BookingExtraCategory[]; prices: BookingExtraPrice[] }> {
  const base = await loadBookingExtraCatalogBase(
    supabase,
    customerId,
    customerGroupId,
    serviceTypes,
    petId
  )
  return base
}

export async function loadBookingExtraCatalogForAdmin(
  supabase: SupabaseClient,
  customerId: string,
  customerGroupId: string | null,
  serviceTypes: ServiceType[],
  petId?: string | null
): Promise<{ categories: BookingExtraCategory[]; prices: BookingExtraPrice[] }> {
  return loadBookingExtraCatalogBase(
    supabase,
    customerId,
    customerGroupId,
    serviceTypes,
    petId
  )
}

async function loadBookingExtraCatalogBase(
  supabase: SupabaseClient,
  customerId: string,
  customerGroupId: string | null,
  serviceTypes: ServiceType[],
  petId?: string | null
): Promise<{ categories: BookingExtraCategory[]; prices: BookingExtraPrice[] }> {
  const catalog = await loadResolvedPriceCatalog(supabase, {
    customerId,
    customerGroupId,
    petId: petId ?? null,
  })

  const extraCategories = filterCategoriesForServices(catalog.categories, serviceTypes)
  const categoryIds = new Set(extraCategories.map((category) => category.id))

  const prices: BookingExtraPrice[] = catalog.prices.map((price) => ({
    ...price,
    catalog_price: price.price,
    final_price: price.final_price ?? price.price,
  }))

  return {
    categories: extraCategories,
    prices: filterBookableExtraPrices(prices, categoryIds),
  }
}

export function validateExtraSelections(
  selections: BookingExtraSelection[],
  allowedPrices: BookingExtraPrice[]
): { valid: true; priceById: Map<string, BookingExtraPrice> } | { valid: false; error: string } {
  const priceById = new Map(allowedPrices.map((price) => [price.id, price]))

  for (const selection of selections) {
    const price = priceById.get(selection.price_id)
    if (!price) {
      return { valid: false, error: 'Ungültige Zusatzleistung ausgewählt.' }
    }
    if (price.applicable === false || price.usage !== 'extra') {
      return { valid: false, error: 'Diese Zusatzleistung kann nicht online gebucht werden.' }
    }
    const qty = selection.quantity ?? 1
    if (qty <= 0 || Number.isNaN(qty)) {
      return { valid: false, error: 'Ungültige Menge für Zusatzleistung.' }
    }
  }

  return { valid: true, priceById }
}

export function buildLineItemsForRequest(
  requestGroupId: string,
  selections: BookingExtraSelection[],
  priceById: Map<string, BookingExtraPrice>,
  createdBy: string | null,
  context?: BuildCustomerLineItemsContext
) {
  return buildCustomerLineItemsFromSelections(
    requestGroupId,
    selections,
    priceById,
    createdBy,
    context
  )
}

export async function loadResolvedPricesForPet(
  supabase: SupabaseClient,
  customerId: string,
  customerGroupId: string | null,
  petId: string
) {
  return loadResolvedPriceCatalog(supabase, {
    customerId,
    customerGroupId,
    petId,
  })
}
