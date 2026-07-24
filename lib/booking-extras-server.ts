import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildCustomerLineItemsFromSelections,
  filterBookableExtraPrices,
  filterExtraCategoriesForServices,
  resolveExtraPriceForCustomer,
  type BookingExtraCategory,
  type BookingExtraPrice,
  type BookingExtraSelection,
  type BuildCustomerLineItemsContext,
} from '@/lib/booking-extras'
import { resolvePriceOverride } from '@/lib/price-override'
import type { ServiceType } from '@/lib/types'

export async function loadBookingExtraCatalogForCustomer(
  supabase: SupabaseClient,
  customerId: string,
  customerGroupId: string | null,
  serviceTypes: ServiceType[]
): Promise<{ categories: BookingExtraCategory[]; prices: BookingExtraPrice[] }> {
  const [categoriesRes, pricesRes] = await Promise.all([
    supabase.from('price_categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('prices').select('*').order('sort_order', { ascending: true }),
  ])

  if (categoriesRes.error) {
    throw categoriesRes.error
  }
  if (pricesRes.error) {
    throw pricesRes.error
  }

  const categories = (categoriesRes.data || []) as BookingExtraCategory[]
  const extraCategories = filterExtraCategoriesForServices(categories, serviceTypes)
  const categoryIds = new Set(extraCategories.map((c) => c.id))

  const customerOverrideMap = new Map<string, any>()
  const groupOverrideMap = new Map<string, any>()

  const [customerPricesRes, groupPricesRes] = await Promise.all([
    supabase
      .from('customer_prices')
      .select('price_id, price, discount_type, discount_value')
      .eq('customer_id', customerId),
    customerGroupId
      ? supabase
          .from('group_prices')
          .select('price_id, price, discount_type, discount_value')
          .eq('group_id', customerGroupId)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  if (customerPricesRes.error) {
    throw customerPricesRes.error
  }
  if (groupPricesRes.error) {
    throw groupPricesRes.error
  }

  customerPricesRes.data?.forEach((o: any) => customerOverrideMap.set(o.price_id, o))
  groupPricesRes.data?.forEach((o: any) => groupOverrideMap.set(o.price_id, o))

  const resolvedPrices: BookingExtraPrice[] = (pricesRes.data || []).map((p: any) => {
    const resolved = resolvePriceOverride(
      p,
      groupOverrideMap.get(p.id),
      customerOverrideMap.get(p.id)
    )
    const finalPrice = resolveExtraPriceForCustomer(
      { ...p, final_price: resolved.final_price ?? p.price },
      groupOverrideMap.get(p.id),
      customerOverrideMap.get(p.id)
    )

    return {
      ...p,
      catalog_price: p.price,
      final_price: finalPrice,
    }
  })

  return {
    categories: extraCategories,
    prices: filterBookableExtraPrices(resolvedPrices, categoryIds),
  }
}

export function validateExtraSelections(
  selections: BookingExtraSelection[],
  allowedPrices: BookingExtraPrice[]
): { valid: true; priceById: Map<string, BookingExtraPrice> } | { valid: false; error: string } {
  const priceById = new Map(allowedPrices.map((p) => [p.id, p]))

  for (const selection of selections) {
    if (!priceById.has(selection.price_id)) {
      return { valid: false, error: 'Ungültige Zusatzleistung ausgewählt.' }
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
