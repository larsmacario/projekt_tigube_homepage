import { describe, expect, it } from 'vitest'

import {
  expandRecurringDayCareBookableDates,
  pickupEventsFromAppointmentPlan,
} from '@/lib/booking-appointment-plan'
import { BOOKING_APPOINTMENT_PLAN_VERSION } from '@/lib/booking-appointment-plan'

describe('booking-appointment-plan', () => {
  it('skips vacation days in recurring expansion', () => {
    const { bookable, skipped } = expandRecurringDayCareBookableDates({
      startDate: '2026-06-01',
      endDate: '2026-06-14',
      weekdays: [1],
      intervalWeeks: 1,
      availability: {
        closedDates: [],
        vacationPeriods: [{ start_date: '2026-06-08', end_date: '2026-06-08' }],
      },
    })
    expect(bookable).toContain('2026-06-01')
    expect(skipped).toContain('2026-06-08')
    expect(bookable).not.toContain('2026-06-08')
  })

  it('pickupEventsFromAppointmentPlan reads vacation blocks', () => {
    const events = pickupEventsFromAppointmentPlan({
      version: BOOKING_APPOINTMENT_PLAN_VERSION,
      vacation_blocks: [
        {
          start_date: '2026-09-01',
          end_date: '2026-09-05',
          drop_off: '07:00',
          pick_up: '17:00',
        },
      ],
    })
    expect(events).toHaveLength(2)
    expect(events[0].kind).toBe('drop_off')
  })
})
