import { describe, expect, it } from 'vitest'

import { buildBookingCancellationEmailContent } from '@/lib/booking-cancellation-email'
import { DEFAULT_CANCELLATION_POLICY_CONFIG } from '@/lib/cancellation-policy-config'

describe('booking-cancellation-email', () => {
  it('enthält Stornobetrag und Erstattung', () => {
    const content = buildBookingCancellationEmailContent({
      customerName: 'Max Mustermann',
      customerEmail: 'max@example.com',
      booking: {
        id: 'b1',
        customer_id: 'c1',
        pet_id: 'p1',
        service_type: 'hundepension',
        start_date: '2026-09-01',
        end_date: '2026-09-10',
        day_care_mode: null,
        day_care_weekdays: null,
        selected_dates: null,
        message: null,
        status: 'cancelled',
        admin_notes: null,
        responded_at: null,
        responded_by: null,
        request_group_id: null,
        cancelled_at: '2026-08-20T10:00:00.000Z',
        cancelled_by: 'u1',
        cancellation_charge_amount: 100,
        cancellation_refund_amount: 100,
        cancellation_policy_snapshot: DEFAULT_CANCELLATION_POLICY_CONFIG,
        cancellation_rule_set_id: 'standard',
        cancellation_tier_label: '14 - 7 Tage vor Check-In',
        cancellation_financial_status: 'pending',
        cancelled_dates: [],
        created_at: '2026-08-01T10:00:00.000Z',
        updated_at: '2026-08-20T10:00:00.000Z',
        pet: { name: 'Bello' },
      },
      preview: {
        ruleSetId: 'standard',
        ruleSetName: 'Standard',
        tierLabel: '14 - 7 Tage vor Check-In',
        chargePercent: 50,
        daysBeforeCheckIn: 12,
        effectiveCancellationDate: '2026-08-20',
        scopeTotal: 200,
        cancellationChargeAmount: 100,
        cancellationRefundAmount: 100,
        policySnapshot: DEFAULT_CANCELLATION_POLICY_CONFIG,
      },
    })

    expect(content.customerText).toContain('Bello')
    expect(content.customerText).toContain('100,00€')
    expect(content.internalText).toContain('SevDesk')
  })
})
