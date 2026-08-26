import type { BookingLineItem, BookingRequest } from '@/lib/types'
import { getBookingLineItems } from '@/lib/cancellation-booking-total'
import { FIXED_PERCENTAGE_SURCHARGE_RATE } from '@/lib/price-catalog-policy'
import { isoWeekdayFromIsoDate } from '@/lib/day-care-interval'

export type DayCareDayPriceSnapshot = {
  date: string
  baseUnitPrice: number
  weekendHolidaySurcharge: number
  recurringExtrasPerDay: number
  dayTotal: number
  components: Array<{ label: string; amount: number }>
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function isSurchargeDay(date: string, holidayDates: Set<string>): boolean {
  const weekday = isoWeekdayFromIsoDate(date)
  return weekday === 6 || weekday === 7 || holidayDates.has(date)
}

/**
 * Ermittelt den Tagespreis für Teilstornos:
 * - Grundpreis aus Buchungs-Line-Items (pro Tag)
 * - Sonn-/Feiertagszuschlag wenn zutreffend
 * - wiederkehrende tagesbezogene Extras
 * - einmalige Zusatzleistungen bleiben außen vor
 */
export function resolveDayCareDayPrice(input: {
  booking: Pick<BookingRequest, 'id' | 'service_type' | 'day_care_mode'>
  lineItems: BookingLineItem[]
  date: string
  holidayDates?: string[]
}): DayCareDayPriceSnapshot {
  const items = getBookingLineItems(input.booking.id, input.lineItems)
  const holidaySet = new Set(input.holidayDates ?? [])
  const components: Array<{ label: string; amount: number }> = []

  const baseItem =
    items.find(
      (item) =>
        !item.addon_service_id &&
        item.unit_price != null &&
        item.unit_price > 0 &&
        (item.price_type === 'fixed' || item.price_type === 'per_unit') &&
        !/zuschlag|sonn|feiertag|einmalig|pauschal/i.test(item.label)
    ) ?? null

  const baseUnitPrice = baseItem?.unit_price ?? 0
  if (baseUnitPrice > 0) {
    components.push({
      label: baseItem?.label || 'Tagespreis',
      amount: baseUnitPrice,
    })
  }

  let weekendHolidaySurcharge = 0
  if (baseUnitPrice > 0 && isSurchargeDay(input.date, holidaySet)) {
    weekendHolidaySurcharge = roundMoney(
      (baseUnitPrice * FIXED_PERCENTAGE_SURCHARGE_RATE) / 100
    )
    components.push({
      label: 'Sonn-/Feiertagszuschlag',
      amount: weekendHolidaySurcharge,
    })
  }

  let recurringExtrasPerDay = 0
  for (const item of items) {
    if (item.id === baseItem?.id) continue
    if (item.addon_service_id) continue
    if (item.unit_price == null || item.unit_price <= 0) continue
    if (/einmalig|pauschal|bringen|holen|abhol/i.test(item.label)) continue
    if (/zuschlag|sonn|feiertag/i.test(item.label)) continue

    const looksDaily =
      (item.unit && /tag/i.test(item.unit)) ||
      item.quantity > 1 ||
      item.price_type === 'per_unit'

    if (!looksDaily) continue

    recurringExtrasPerDay = roundMoney(recurringExtrasPerDay + item.unit_price)
    components.push({ label: item.label, amount: item.unit_price })
  }

  const dayTotal = roundMoney(baseUnitPrice + weekendHolidaySurcharge + recurringExtrasPerDay)

  return {
    date: input.date,
    baseUnitPrice,
    weekendHolidaySurcharge,
    recurringExtrasPerDay,
    dayTotal,
    components,
  }
}

export function resolveScopeTotalForCancelledDates(input: {
  booking: Pick<BookingRequest, 'id' | 'service_type' | 'day_care_mode' | 'selected_dates'>
  lineItems: BookingLineItem[]
  datesToCancel: string[]
  bookingTotal: number
  holidayDates?: string[]
}): {
  scopeTotal: number
  priceSnapshot: {
    perDay: DayCareDayPriceSnapshot[]
    dayCount: number
    method: 'day_price' | 'ratio' | 'full'
  }
} {
  const dates = [...input.datesToCancel].sort()

  if (
    input.booking.service_type === 'tagesbetreuung' &&
    input.booking.day_care_mode === 'recurring' &&
    dates.length > 0
  ) {
    const perDay = dates.map((date) =>
      resolveDayCareDayPrice({
        booking: input.booking,
        lineItems: input.lineItems,
        date,
        holidayDates: input.holidayDates,
      })
    )
    const scopeTotal = roundMoney(perDay.reduce((sum, row) => sum + row.dayTotal, 0))
    return {
      scopeTotal,
      priceSnapshot: { perDay, dayCount: dates.length, method: 'day_price' },
    }
  }

  if (input.booking.selected_dates?.length && dates.length > 0) {
    const ratio = dates.length / Math.max(input.booking.selected_dates.length, 1)
    return {
      scopeTotal: roundMoney(input.bookingTotal * ratio),
      priceSnapshot: {
        perDay: dates.map((date) =>
          resolveDayCareDayPrice({
            booking: input.booking,
            lineItems: input.lineItems,
            date,
            holidayDates: input.holidayDates,
          })
        ),
        dayCount: dates.length,
        method: 'ratio',
      },
    }
  }

  return {
    scopeTotal: input.bookingTotal,
    priceSnapshot: { perDay: [], dayCount: dates.length, method: 'full' },
  }
}
