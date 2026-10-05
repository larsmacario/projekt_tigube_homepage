import { getActiveBookingDates } from '@/lib/cancellation-booking-total'
import { resolveDayCareDayPrice } from '@/lib/cancellation-day-price'
import type { BookingLineItemInsert } from '@/lib/booking-extras'
import type { BookingLineItem, BookingRequest } from '@/lib/types'

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function looksDaySyncedLine(item: BookingLineItem): boolean {
  if (item.booking_id == null) return false
  if (item.addon_service_id) return false
  if (/zuschlag|sonn|feiertag|bringen|holen|abhol|einmalig|pauschal|übernacht/i.test(item.label)) {
    return false
  }
  if (item.unit && /tag/i.test(item.unit)) return true
  if (item.price_type === 'per_unit' && item.quantity > 1) return true
  return false
}

export function computeLineItemQuantityUpdates(
  booking: BookingRequest,
  lineItems: BookingLineItem[]
): Array<{ id: string; quantity: number; line_total: number | null }> {
  const activeCount = getActiveBookingDates(booking).length
  if (activeCount < 1) return []

  const updates: Array<{ id: string; quantity: number; line_total: number | null }> = []

  for (const item of lineItems) {
    if (item.booking_id !== booking.id) continue
    if (!looksDaySyncedLine(item)) continue
    const quantity = activeCount
    const line_total =
      item.unit_price != null ? roundMoney(item.unit_price * quantity) : item.line_total
    if (item.quantity === quantity && item.line_total === line_total) continue
    updates.push({ id: item.id, quantity, line_total })
  }

  return updates
}

export function buildAddedDayLineItems(input: {
  booking: BookingRequest
  requestGroupId: string
  addedDates: string[]
  lineItems: BookingLineItem[]
  holidayDates: string[]
  createdBy: string | null
}): BookingLineItemInsert[] {
  const { booking, addedDates, lineItems, holidayDates, requestGroupId, createdBy } = input
  if (addedDates.length === 0) return []

  const items: BookingLineItemInsert[] = []
  const sorted = [...addedDates].sort()

  for (const date of sorted) {
    const snapshot = resolveDayCareDayPrice({
      booking,
      lineItems,
      date,
      holidayDates,
    })
    if (snapshot.dayTotal <= 0) continue

    const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    for (const component of snapshot.components) {
      if (component.amount <= 0) continue
      items.push({
        request_group_id: requestGroupId,
        booking_id: booking.id,
        price_id: null,
        addon_service_id: null,
        label: `${dateLabel}: ${component.label}`,
        description: 'Anpassung – zusätzlicher Tag',
        price_type: 'fixed',
        unit: null,
        quantity: 1,
        unit_price: component.amount,
        line_total: component.amount,
        source: 'customer',
        created_by: createdBy,
      })
    }
  }

  return items
}
