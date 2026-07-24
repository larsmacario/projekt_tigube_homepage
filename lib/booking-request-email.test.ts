import { describe, expect, it } from 'vitest'

import {
  bookingRequestEmailPlainText,
  bookingServiceLabel,
  buildBookingPeriodSummary,
  buildBookingRequestEmailContent,
} from '@/lib/booking-request-email'

describe('booking-request-email', () => {
  it('labels services in German', () => {
    expect(bookingServiceLabel('hundepension')).toBe('Urlaubsbetreuung')
  })

  it('builds period summary from dates', () => {
    const summary = buildBookingPeriodSummary({
      service_type: 'hundepension',
      day_care_mode: null,
      day_care_weekdays: null,
      selected_dates: null,
      start_date: '2026-07-24',
      end_date: '2026-07-26',
    })
    expect(summary).toContain('Juli')
  })

  it('includes pet lines in plain text', () => {
    const content = buildBookingRequestEmailContent({
      customerName: 'Max Mustermann',
      customerEmail: 'max@example.com',
      message: 'Bitte abends füttern',
      bookings: [
        {
          service_type: 'hundepension',
          start_date: '2026-07-24',
          end_date: '2026-07-24',
          pet: { name: 'Bello' },
        },
      ],
    })
    const text = bookingRequestEmailPlainText(content)
    expect(text).toContain('Bello')
    expect(text).toContain('max@example.com')
    expect(text).toContain('Bitte abends füttern')
  })
})
