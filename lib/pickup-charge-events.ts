import type { BookingExtraCategory, BookingExtraPrice, BookingLineItemInsert } from '@/lib/booking-extras'
import { buildPublicHolidayDateSet } from '@/lib/public-holidays-de'
import {
  evaluatePickupTimeOnDate,
  findOutOfHoursPickupCatalogPrice,
  needsOutOfHoursPickupFee,
  resolveOutOfHoursPickupUnitPrice,
} from '@/lib/pickup-time-surcharge'
import type { PickupChargeEvent } from '@/lib/booking-appointment-plan'
import {
  findOvernightCatalogPrice,
  needsOvernightOnLastDay,
  resolveOvernightUnitPrice,
} from '@/lib/overnight-surcharge'

export function buildPickupSurchargeLineItemsFromEvents(params: {
  requestGroupId: string
  events: PickupChargeEvent[]
  publicHolidays: Array<{ date: string; name?: string }>
  prices: BookingExtraPrice[]
  categories: BookingExtraCategory[]
  createdBy: string | null
}): BookingLineItemInsert[] {
  const { requestGroupId, events, publicHolidays, prices, categories, createdBy } = params
  if (events.length === 0) return []

  const holidaySet = buildPublicHolidayDateSet(publicHolidays)
  const unitPrice = resolveOutOfHoursPickupUnitPrice(prices, categories)
  const catalogPrice = findOutOfHoursPickupCatalogPrice(prices, categories)
  const priceId = catalogPrice?.id ?? null
  const unit = catalogPrice?.unit ?? 'pro Termin'
  const priceType = catalogPrice?.price_type ?? 'fixed'

  let dropCount = 0
  let pickCount = 0

  for (const event of events) {
    const evalResult = evaluatePickupTimeOnDate(event.date, event.time, holidaySet)
    if (!needsOutOfHoursPickupFee(evalResult)) continue
    if (event.kind === 'drop_off') dropCount += 1
    else pickCount += 1
  }

  const items: BookingLineItemInsert[] = []
  if (dropCount > 0) {
    items.push({
      request_group_id: requestGroupId,
      booking_id: null,
      price_id: priceId,
      addon_service_id: null,
      label: 'Bringen außerhalb Standardzeit',
      description: catalogPrice?.description ?? null,
      price_type: priceType,
      unit,
      quantity: dropCount,
      unit_price: unitPrice,
      line_total: unitPrice * dropCount,
      source: 'customer',
      created_by: createdBy,
    })
  }
  if (pickCount > 0) {
    items.push({
      request_group_id: requestGroupId,
      booking_id: null,
      price_id: priceId,
      addon_service_id: null,
      label: 'Abholen außerhalb Standardzeit',
      description: catalogPrice?.description ?? null,
      price_type: priceType,
      unit,
      quantity: pickCount,
      unit_price: unitPrice,
      line_total: unitPrice * pickCount,
      source: 'customer',
      created_by: createdBy,
    })
  }

  return items
}

export function buildOvernightSurchargeLineItemsFromEvents(params: {
  requestGroupId: string
  events: PickupChargeEvent[]
  prices: BookingExtraPrice[]
  categories: BookingExtraCategory[]
  createdBy: string | null
}): BookingLineItemInsert[] {
  const { requestGroupId, events, prices, categories, createdBy } = params

  const pickEvents = events.filter((e) => e.kind === 'pick_up')
  let overnightCount = 0
  for (const event of pickEvents) {
    if (needsOvernightOnLastDay(event.time)) overnightCount += 1
  }
  if (overnightCount === 0) return []

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
      quantity: overnightCount,
      unit_price: unitPrice,
      line_total: unitPrice * overnightCount,
      source: 'customer',
      created_by: createdBy,
    },
  ]
}
