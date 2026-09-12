import type { BookingExtraCategory, BookingExtraPrice, BookingLineItemInsert } from '@/lib/booking-extras'
import { buildPublicHolidayDateSet } from '@/lib/public-holidays-de'
import {
  findWeekendHolidayTravelCatalogPrice,
  listWeekendHolidayTravelDates,
  resolveWeekendHolidayTravelUnitPrice,
} from '@/lib/booking-sunday-holiday-surcharge'

export function buildWeekendTravelSurchargeLineItems(params: {
  requestGroupId: string
  pickupSpan: { start: string; end: string } | null
  publicHolidays: Array<{ date: string; name?: string }>
  prices: BookingExtraPrice[]
  categories: BookingExtraCategory[]
  createdBy: string | null
}): BookingLineItemInsert[] {
  const { requestGroupId, pickupSpan, publicHolidays, prices, categories, createdBy } = params
  if (!pickupSpan) return []

  const holidaySet = buildPublicHolidayDateSet(publicHolidays)
  const travelDates = listWeekendHolidayTravelDates(
    pickupSpan.start,
    pickupSpan.end,
    holidaySet
  )
  if (travelDates.length === 0) return []

  const unitPrice = resolveWeekendHolidayTravelUnitPrice(prices, categories)
  const catalogPrice = findWeekendHolidayTravelCatalogPrice(prices, categories)
  const priceId = catalogPrice?.id ?? null
  const label = catalogPrice?.name ?? 'An- und Abreise an Sonn- und Feiertagen'
  const unit = catalogPrice?.unit ?? 'pauschal'
  const priceType = catalogPrice?.price_type ?? 'fixed'

  return travelDates.map((isoDate) => ({
    request_group_id: requestGroupId,
    booking_id: null,
    price_id: priceId,
    addon_service_id: null,
    label:
      travelDates.length === 1
        ? label
        : `${label} (${isoDate === pickupSpan.start ? 'Bringen' : 'Abholen'})`,
    description: catalogPrice?.description ?? null,
    price_type: priceType,
    unit,
    quantity: 1,
    unit_price: unitPrice,
    line_total: unitPrice,
    source: 'customer' as const,
    created_by: createdBy,
  }))
}
