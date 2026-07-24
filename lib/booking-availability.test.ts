import { describe, expect, it } from 'vitest'
import {
  countApprovedBookingsOnDate,
  getCapacityLimit,
  getVacationPeriodsInRange,
  isDayClosed,
  validateBookingAvailability,
  type AvailabilityContext,
} from '@/lib/booking-availability'
import type { ServiceType } from '@/lib/types'

const baseContext: AvailabilityContext = {
  vacations: [
    {
      period: '01.08.2026 bis 15.08.2026',
      label: 'Sommerferien',
      start_date: '2026-08-01',
      end_date: '2026-08-15',
    },
  ],
  capacitySettings: [
    { id: '1', service_type: null, default_capacity: 10, created_at: '', updated_at: '' },
    { id: '2', service_type: 'hundepension', default_capacity: 5, created_at: '', updated_at: '' },
  ],
  capacityOverrides: [
    {
      id: '3',
      date: '2026-09-01',
      service_type: null,
      capacity: 0,
      reason: 'Betriebsruhe',
      created_at: '',
    },
  ],
  approvedBookings: [
    {
      id: 'b1',
      service_type: 'hundepension',
      start_date: '2026-09-10',
      end_date: '2026-09-12',
    },
    {
      id: 'b2',
      service_type: 'katzenbetreuung',
      start_date: '2026-09-10',
      end_date: '2026-09-10',
    },
  ],
}

describe('booking availability', () => {
  it('erkennt Überschneidungen mit Betriebsferien', () => {
    const result = validateBookingAvailability(baseContext, {
      serviceType: 'hundepension',
      startDate: '2026-08-10',
      endDate: '2026-08-20',
      checkCapacity: false,
    })

    expect(result.valid).toBe(false)
    expect(result.conflicts[0]?.reason).toBe('vacation')
  })

  it('erkennt geschlossene Tage über Override mit Kapazität 0', () => {
    expect(
      isDayClosed('2026-09-01', 'hundepension', baseContext.capacitySettings, baseContext.capacityOverrides)
    ).toBe(true)

    const result = validateBookingAvailability(baseContext, {
      serviceType: 'hundepension',
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      checkCapacity: false,
    })

    expect(result.valid).toBe(false)
    expect(result.conflicts[0]?.reason).toBe('closed')
  })

  it('prüft Gesamt- und Service-Kapazität bei Genehmigung', () => {
    const context: AvailabilityContext = {
      ...baseContext,
      capacitySettings: [
        { id: '1', service_type: null, default_capacity: 2, created_at: '', updated_at: '' },
        { id: '2', service_type: 'hundepension', default_capacity: 1, created_at: '', updated_at: '' },
      ],
      approvedBookings: [
        {
          id: 'b1',
          service_type: 'hundepension',
          start_date: '2026-09-10',
          end_date: '2026-09-10',
        },
        {
          id: 'b2',
          service_type: 'katzenbetreuung',
          start_date: '2026-09-10',
          end_date: '2026-09-10',
        },
      ],
    }

    const result = validateBookingAvailability(context, {
      serviceType: 'hundepension',
      startDate: '2026-09-10',
      endDate: '2026-09-10',
      checkCapacity: true,
    })

    expect(result.valid).toBe(false)
    expect(result.conflicts.some((conflict) => conflict.reason === 'capacity_overall')).toBe(true)
    expect(result.conflicts.some((conflict) => conflict.reason === 'capacity_service')).toBe(true)
  })

  it('ignoriert Kapazität bei Anfrage ohne Genehmigung', () => {
    const context: AvailabilityContext = {
      ...baseContext,
      capacitySettings: [
        { id: '1', service_type: null, default_capacity: 1, created_at: '', updated_at: '' },
        { id: '2', service_type: 'hundepension', default_capacity: 1, created_at: '', updated_at: '' },
      ],
      approvedBookings: [
        {
          id: 'b1',
          service_type: 'hundepension',
          start_date: '2026-09-10',
          end_date: '2026-09-10',
        },
      ],
    }

    const result = validateBookingAvailability(context, {
      serviceType: 'hundepension',
      startDate: '2026-09-10',
      endDate: '2026-09-10',
      checkCapacity: false,
    })

    expect(result.valid).toBe(true)
  })

  it('schließt die zu genehmigende Buchung bei parallelen Genehmigungen aus', () => {
    const context: AvailabilityContext = {
      ...baseContext,
      capacitySettings: [
        { id: '1', service_type: null, default_capacity: 1, created_at: '', updated_at: '' },
        { id: '2', service_type: 'hundepension', default_capacity: 1, created_at: '', updated_at: '' },
      ],
      approvedBookings: [],
    }

    const result = validateBookingAvailability(context, {
      serviceType: 'hundepension',
      startDate: '2026-09-10',
      endDate: '2026-09-10',
      excludeBookingId: 'pending-1',
      checkCapacity: true,
    })

    expect(result.valid).toBe(true)
  })

  it('nutzt Override statt Standardkapazität', () => {
    const limit = getCapacityLimit(
      '2026-09-05',
      'hundepension' as ServiceType,
      baseContext.capacitySettings,
      [
        ...baseContext.capacityOverrides,
        {
          id: '4',
          date: '2026-09-05',
          service_type: 'hundepension',
          capacity: 2,
          reason: null,
          created_at: '',
        },
      ]
    )

    expect(limit).toBe(2)
  })

  it('zählt genehmigte Buchungen pro Tag korrekt', () => {
    expect(
      countApprovedBookingsOnDate('2026-09-10', null, baseContext.approvedBookings)
    ).toBe(2)
    expect(
      countApprovedBookingsOnDate('2026-09-10', 'hundepension', baseContext.approvedBookings)
    ).toBe(1)
  })

  it('löst Ferien aus period-Text wenn start_date/end_date fehlen', () => {
    const periods = getVacationPeriodsInRange(
      [
        {
          period: '17.09. bis 28.09.2026',
          label: 'geschlossen',
        },
      ],
      '2026-09-01',
      '2026-12-31'
    )

    expect(periods).toHaveLength(1)
    expect(periods[0]?.start_date).toBe('2026-09-17')
    expect(periods[0]?.end_date).toBe('2026-09-28')
  })
})
