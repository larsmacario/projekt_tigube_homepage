import type { BookingExtraCategory, BookingExtraPrice, BookingLineItemInsert } from '@/lib/booking-extras'
import { buildPublicHolidayDateSet } from '@/lib/public-holidays-de'
import {
  evaluatePickupTimeOnDate,
  findOutOfHoursPickupCatalogPrice,
  needsOutOfHoursPickupFee,
  resolveOutOfHoursPickupUnitPrice,
} from '@/lib/pickup-time-surcharge'

export function buildPickupSurchargeLineItems(params: {
  requestGroupId: string
  dropOffTime: string
  pickUpTime: string
  pickupSpan: { start: string; end: string } | null
  publicHolidays: Array<{ date: string; name?: string }>
  prices: BookingExtraPrice[]
  categories: BookingExtraCategory[]
  createdBy: string | null
}): BookingLineItemInsert[] {
  const { requestGroupId, dropOffTime, pickUpTime, pickupSpan, publicHolidays, prices, categories, createdBy } =
    params

  if (!pickupSpan) return []

  const holidaySet = buildPublicHolidayDateSet(publicHolidays)
  const unitPrice = resolveOutOfHoursPickupUnitPrice(prices, categories)
  const catalogPrice = findOutOfHoursPickupCatalogPrice(prices, categories)
  const priceId = catalogPrice?.id ?? null
  const labelBase = catalogPrice?.name ?? 'Bring-/Holzeit außerhalb Standardzeit'
  const unit = catalogPrice?.unit ?? 'pro Termin'
  const priceType = catalogPrice?.price_type ?? 'fixed'

  const items: BookingLineItemInsert[] = []

  const dropEval = evaluatePickupTimeOnDate(pickupSpan.start, dropOffTime, holidaySet)
  if (needsOutOfHoursPickupFee(dropEval)) {
    items.push({
      request_group_id: requestGroupId,
      booking_id: null,
      price_id: priceId,
      addon_service_id: null,
      label: `Bringen außerhalb Standardzeit`,
      description: catalogPrice?.description ?? null,
      price_type: priceType,
      unit,
      quantity: 1,
      unit_price: unitPrice,
      line_total: unitPrice,
      source: 'customer',
      created_by: createdBy,
    })
  }

  const pickEval = evaluatePickupTimeOnDate(pickupSpan.end, pickUpTime, holidaySet)
  if (needsOutOfHoursPickupFee(pickEval)) {
    items.push({
      request_group_id: requestGroupId,
      booking_id: null,
      price_id: priceId,
      addon_service_id: null,
      label: `Abholen außerhalb Standardzeit`,
      description: catalogPrice?.description ?? null,
      price_type: priceType,
      unit,
      quantity: 1,
      unit_price: unitPrice,
      line_total: unitPrice,
      source: 'customer',
      created_by: createdBy,
    })
  }

  return items
}
