import { describe, expect, it } from 'vitest'

import {
  canModifyBookingStatus,
  diffBookingModification,
  resolveTargetFields,
} from '@/lib/booking-modification'
import type { BookingRequest } from '@/lib/types'

function baseBooking(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    id: 'b1',
    customer_id: 'c1',
    pet_id: 'p1',
    service_type: 'hundepension',
    start_date: '2026-06-01',
    end_date: '2026-06-05',
    day_care_mode: null,
    day_care_weekdays: null,
    day_care_interval_weeks: null,
    selected_dates: null,
    message: null,
    status: 'approved',
    admin_notes: null,
    responded_at: null,
    responded_by: null,
    request_group_id: 'g1',
    cancelled_at: null,
    cancelled_by: null,
    cancellation_charge_amount: null,
    cancellation_refund_amount: null,
    cancellation_policy_snapshot: null,
    cancellation_rule_set_id: null,
    cancellation_tier_label: null,
    cancellation_financial_status: 'none',
    cancelled_dates: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('booking-modification', () => {
  it('allows pending and approved only', () => {
    expect(canModifyBookingStatus('pending')).toBe(true)
    expect(canModifyBookingStatus('approved')).toBe(true)
    expect(canModifyBookingStatus('cancelled')).toBe(false)
  })

  it('diffs pension range trim', () => {
    const booking = baseBooking()
    const diff = diffBookingModification(booking, {
      start_date: '2026-06-01',
      end_date: '2026-06-03',
    })
    expect(diff.removed).toEqual(['2026-06-04', '2026-06-05'])
    expect(diff.added).toEqual([])
    expect(diff.nextFields.end_date).toBe('2026-06-03')
  })

  it('diffs once day care selected dates', () => {
    const booking = baseBooking({
      service_type: 'tagesbetreuung',
      day_care_mode: 'once',
      start_date: '2026-06-01',
      end_date: '2026-06-03',
      selected_dates: ['2026-06-01', '2026-06-03'],
    })
    const diff = diffBookingModification(booking, {
      selected_dates: ['2026-06-01', '2026-06-02', '2026-06-03'],
    })
    expect(diff.added).toEqual(['2026-06-02'])
    expect(diff.removed).toEqual([])
  })

  it('clears cancelled_dates for pending', () => {
    const booking = baseBooking({
      status: 'pending',
      cancelled_dates: ['2026-06-02'],
    })
    const fields = resolveTargetFields(booking, {
      start_date: '2026-06-01',
      end_date: '2026-06-04',
    })
    expect(fields.cancelled_dates).toEqual([])
  })

  it('diffs recurring when weekdays change', () => {
    const booking = baseBooking({
      service_type: 'tagesbetreuung',
      day_care_mode: 'recurring',
      start_date: '2026-06-02',
      end_date: '2026-06-20',
      day_care_weekdays: [2],
      day_care_interval_weeks: 1,
    })
    const diff = diffBookingModification(booking, {
      start_date: '2026-06-02',
      end_date: '2026-06-20',
      day_care_weekdays: [2, 4],
      day_care_interval_weeks: 1,
    })
    expect(diff.added.length).toBeGreaterThan(0)
    expect(diff.nextFields.day_care_weekdays).toEqual([2, 4])
  })
})
