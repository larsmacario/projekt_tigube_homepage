import { describe, expect, it } from 'vitest'

import {
  assessInvoiceEligibility,
  isCancellationInvoiceCandidate,
  validateInvoiceLineItems,
} from '@/lib/invoice-eligibility'
import type { BookingLineItem, BookingRequest } from '@/lib/types'

function booking(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    id: 'booking-1',
    customer_id: 'customer-1',
    pet_id: 'pet-1',
    service_type: 'hundepension',
    start_date: '2026-07-01',
    end_date: '2026-07-05',
    day_care_mode: null,
    day_care_weekdays: null,
    selected_dates: null,
    message: null,
    status: 'approved',
    admin_notes: null,
    responded_at: null,
    responded_by: null,
    request_group_id: 'group-1',
    cancelled_at: null,
    cancelled_by: null,
    cancellation_charge_amount: null,
    cancellation_refund_amount: null,
    cancellation_policy_snapshot: null,
    cancellation_rule_set_id: null,
    cancellation_tier_label: null,
    cancellation_financial_status: 'none',
    cancelled_dates: [],
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

function lineItem(overrides: Partial<BookingLineItem> = {}): BookingLineItem {
  return {
    id: 'line-1',
    request_group_id: 'group-1',
    booking_id: 'booking-1',
    price_id: null,
    addon_service_id: null,
    label: 'Pension',
    description: null,
    price_type: 'fixed',
    unit: null,
    quantity: 1,
    unit_price: 100,
    line_total: 100,
    source: 'admin',
    created_by: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

describe('invoice-eligibility', () => {
  it('markiert abgeschlossene bestätigte Anfragen als abrechenbar', () => {
    const result = assessInvoiceEligibility({
      bookings: [booking()],
      lineItems: [lineItem()],
      customer: { sevdesk_contact_id: '123', kundennummer: 'K-1' },
      referenceDate: new Date('2026-08-01'),
    })

    expect(result.eligible).toBe(true)
    expect(result.blockers).toHaveLength(0)
    expect(result.lineItemTotal).toBe(100)
  })

  it('blockiert noch laufende Buchungen', () => {
    const result = assessInvoiceEligibility({
      bookings: [booking({ end_date: '2026-08-10' })],
      lineItems: [lineItem()],
      customer: { sevdesk_contact_id: '123', kundennummer: 'K-1' },
      referenceDate: new Date('2026-08-01'),
    })

    expect(result.eligible).toBe(false)
    expect(result.blockers.some((blocker) => blocker.includes('noch nicht beendet'))).toBe(true)
  })

  it('blockiert fehlende SevDesk-Verknüpfung', () => {
    const result = assessInvoiceEligibility({
      bookings: [booking()],
      lineItems: [lineItem()],
      customer: { sevdesk_contact_id: null, kundennummer: 'K-1' },
      referenceDate: new Date('2026-08-01'),
    })

    expect(result.eligible).toBe(false)
    expect(result.blockers.some((blocker) => blocker.includes('SevDesk'))).toBe(true)
  })

  it('blockiert Prozent-Positionen ohne Endbetrag', () => {
    const validation = validateInvoiceLineItems([
      lineItem({ price_type: 'percentage', line_total: null }),
    ])

    expect(validation.valid).toBe(false)
    expect(validation.blockers[0]).toContain('Prozentwert')
  })

  it('erkennt Storno-Kandidaten separat von regulären Rechnungen', () => {
    expect(
      isCancellationInvoiceCandidate([
        booking({
          status: 'cancelled',
          cancellation_financial_status: 'pending',
          cancellation_charge_amount: 50,
        }),
      ])
    ).toBe(true)

    expect(
      assessInvoiceEligibility({
        bookings: [
          booking({
            status: 'cancelled',
            cancellation_financial_status: 'pending',
            cancellation_charge_amount: 50,
          }),
        ],
        lineItems: [lineItem()],
        customer: { sevdesk_contact_id: '123', kundennummer: 'K-1' },
        referenceDate: new Date('2026-08-01'),
      }).eligible
    ).toBe(false)
  })
})
