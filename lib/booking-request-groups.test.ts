import { describe, expect, it } from 'vitest'
import {
  categorizeBookingGroups,
  groupBookingsForDisplay,
  type BookingRequestGroup,
} from '@/lib/booking-request-groups'
import type { BookingRequest } from '@/lib/types'

function booking(partial: Partial<BookingRequest> & Pick<BookingRequest, 'id' | 'start_date'>): BookingRequest {
  return {
    customer_id: 'c1',
    pet_id: 'p1',
    service_type: 'hundepension',
    end_date: '2026-08-10',
    day_care_mode: null,
    day_care_weekdays: null,
    selected_dates: null,
    message: null,
    admin_notes: null,
    responded_at: null,
    responded_by: null,
    request_group_id: null,
    created_at: '',
    updated_at: '',
    status: 'approved',
    ...partial,
  }
}

describe('categorizeBookingGroups', () => {
  const ref = new Date(2026, 7, 15)

  it('puts pending groups in open only', () => {
    const groups = groupBookingsForDisplay([
      booking({ id: '1', start_date: '2026-09-01', end_date: '2026-09-05', status: 'pending' }),
    ])
    const { open, future } = categorizeBookingGroups(groups, ref)
    expect(open).toHaveLength(1)
    expect(future).toHaveLength(0)
  })

  it('splits approved by date', () => {
    const groups: BookingRequestGroup[] = [
      {
        key: 'f',
        request_group_id: null,
        bookings: [booking({ id: 'f', start_date: '2026-09-01', end_date: '2026-09-05' })],
        start_date: '2026-09-01',
        end_date: '2026-09-05',
        status: 'approved',
        message: null,
      },
      {
        key: 'p',
        request_group_id: null,
        bookings: [booking({ id: 'p', start_date: '2026-07-01', end_date: '2026-07-10' })],
        start_date: '2026-07-01',
        end_date: '2026-07-10',
        status: 'approved',
        message: null,
      },
    ]
    const { future, past } = categorizeBookingGroups(groups, ref)
    expect(future).toHaveLength(1)
    expect(past).toHaveLength(1)
  })
})
