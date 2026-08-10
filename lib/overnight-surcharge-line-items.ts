import type { BookingExtraCategory, BookingExtraPrice, BookingLineItemInsert } from '@/lib/booking-extras'
import {
  findOvernightCatalogPrice,
  needsOvernightOnLastDay,
  resolveOvernightUnitPrice,
} from '@/lib/overnight-surcharge'

export function buildOvernightSurchargeLineItems(params: {
  requestGroupId: string
  pickUpTime: string
  prices: BookingExtraPrice[]
  categories: BookingExtraCategory[]
  createdBy: string | null
}): BookingLineItemInsert[] {
  const { requestGroupId, pickUpTime, prices, categories, createdBy } = params

  if (!needsOvernightOnLastDay(pickUpTime)) return []

  const unitPrice = resolveOvernightUnitPrice(prices, categories)
  const catalogPrice = findOvernightCatalogPrice(prices, categories)
  const priceId = catalogPrice?.id ?? null
  const unit = catalogPrice?.unit ?? 'je Nacht'
  const priceType = catalogPrice?.price_type ?? 'fixed'

  return [
    {
      request_group_id: requestGroupId,
      booking_id: null,
      price_id: priceId,
      addon_service_id: null,
      label: catalogPrice?.name ?? 'Übernachtung',
      description: catalogPrice?.description ?? null,
      price_type: priceType,
      unit,
      quantity: 1,
      unit_price: unitPrice,
      line_total: unitPrice,
      source: 'customer',
      created_by: createdBy,
    },
  ]
}
