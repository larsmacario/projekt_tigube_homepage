import { describe, expect, it } from 'vitest'

import { resolveDayCareDayPrice, resolveScopeTotalForCancelledDates } from '@/lib/cancellation-day-price'
import type { BookingLineItem, BookingRequest } from '@/lib/types'

const booking = {
  id: 'b1',
  service_type: 'tagesbetreuung',
  day_care_mode: 'recurring',
  selected_dates: null,
} as Pick<BookingRequest, 'id' | 'service_type' | 'day_care_mode' | 'selected_dates'>

const lineItems: BookingLineItem[] = [
  {
    id: 'li1',
    request_group_id: 'g1',
    booking_id: 'b1',
    price_id: 'p1',
    addon_service_id: null,
    label: 'Tagesbetreuung',
    description: null,
    price_type: 'fixed',
    unit: 'Tag',
    quantity: 1,
    unit_price: 40,
    line_total: 40,
    source: 'customer',
    created_by: null,
    created_at: '',
    updated_at: '',
  },
]

describe('cancellation-day-price', () => {
  it('berechnet Tagespreis inkl. Wochenendzuschlag', () => {
    // 2026-09-05 = Samstag
    const day = resolveDayCareDayPrice({
      booking,
      lineItems,
      date: '2026-09-05',
    })
    expect(day.baseUnitPrice).toBe(40)
    expect(day.weekendHolidaySurcharge).toBe(20)
    expect(day.dayTotal).toBe(60)
  })

  it('summiert Tagespreise für Teilstorno-Scope', () => {
    const scope = resolveScopeTotalForCancelledDates({
      booking,
      lineItems,
      datesToCancel: ['2026-09-02', '2026-09-05'],
      bookingTotal: 0,
    })
    expect(scope.priceSnapshot.method).toBe('day_price')
    expect(scope.scopeTotal).toBe(100) // Mi 40 + Sa 60
  })
})
