import { describe, expect, it } from 'vitest'

import {
  buildBookingInsertRow,
  buildBookingInsertRows,
  validatePortalPetLines,
  type PortalPetBookingLine,
} from '@/lib/booking-batch-create'
import {
  buildPortalBookingPetsPayload,
  validatePortalBookingStep2,
  type PortalBookingStep2Input,
} from '@/lib/portal-booking-step2-validation'
import { resolvePickupDateSpanFromPortalLines } from '@/lib/pickup-date-span'

const OPEN_AVAILABILITY = { closedDates: [] as string[], vacationPeriods: [] }
const CLOSED_2026_09_11 = { closedDates: ['2026-09-11'], vacationPeriods: [] }

function d(y: number, m: number, day: number) {
  return new Date(y, m - 1, day)
}

function baseStep2(overrides: Partial<PortalBookingStep2Input>): PortalBookingStep2Input {
  return {
    petLines: [],
    petNames: {},
    dayCareOnceDates: {},
    dayCareRecurring: {},
    dropOffTime: '07:00',
    pickUpTime: '17:00',
    availability: OPEN_AVAILABILITY,
    ...overrides,
  }
}

function expectValidStep2(input: PortalBookingStep2Input) {
  expect(validatePortalBookingStep2(input)).toBeNull()
}

function expectInvalidStep2(input: PortalBookingStep2Input, messagePart: string) {
  const error = validatePortalBookingStep2(input)
  expect(error).not.toBeNull()
  expect(error!.description).toContain(messagePart)
}

describe('Portal-Buchungsflow – Schritt 2 (Client-Validierung)', () => {
  describe('Ein Tier', () => {
    it('Urlaubsbetreuung (Hundepension) mit Zeitraum und Bring-/Holzeiten', () => {
      expectValidStep2(
        baseStep2({
          petLines: [{ pet_id: 'pet-a', service_type: 'hundepension' }],
          petNames: { 'pet-a': 'Bello' },
          dateRange: { from: d(2026, 9, 11), to: d(2026, 9, 14) },
        })
      )
    })

    it('Katzenbetreuung mit Zeitraum, ohne Bring-/Holzeiten', () => {
      expectValidStep2(
        baseStep2({
          petLines: [{ pet_id: 'pet-c', service_type: 'katzenbetreuung' }],
          petNames: { 'pet-c': 'Mimi' },
          dateRange: { from: d(2026, 9, 11), to: d(2026, 9, 14) },
          dropOffTime: '',
          pickUpTime: '',
        })
      )
    })

    it('Tagesbetreuung einmalig mit mehreren Tagen', () => {
      expectValidStep2(
        baseStep2({
          petLines: [
            { pet_id: 'pet-a', service_type: 'tagesbetreuung', day_care_mode: 'once' },
          ],
          petNames: { 'pet-a': 'Bello' },
          dayCareOnceDates: {
            'pet-a': [d(2026, 9, 11), d(2026, 9, 14)],
          },
        })
      )
    })

    it('Tagesbetreuung feste Wochentage mit Mo/Fr und Startdatum', () => {
      expectValidStep2(
        baseStep2({
          petLines: [
            { pet_id: 'pet-a', service_type: 'tagesbetreuung', day_care_mode: 'recurring' },
          ],
          petNames: { 'pet-a': 'Bello' },
          dayCareRecurring: {
            'pet-a': { weekdays: [1, 5], startDate: d(2026, 9, 14), intervalWeeks: 1 },
          },
        })
      )
    })

    it('lehnt Hundepension ohne Zeitraum ab', () => {
      expectInvalidStep2(
        baseStep2({
          petLines: [{ pet_id: 'pet-a', service_type: 'hundepension' }],
        }),
        'Betreuungszeitraum'
      )
    })

    it('lehnt Tagesbetreuung einmalig ohne Tage ab', () => {
      expectInvalidStep2(
        baseStep2({
          petLines: [
            { pet_id: 'pet-a', service_type: 'tagesbetreuung', day_care_mode: 'once' },
          ],
          petNames: { 'pet-a': 'Bello' },
        }),
        'Bello'
      )
    })

    it('lehnt feste Wochentage ohne Mo–So ab (Original-Bug)', () => {
      const error = validatePortalBookingStep2(
        baseStep2({
          petLines: [
            { pet_id: 'pet-b', service_type: 'tagesbetreuung', day_care_mode: 'recurring' },
          ],
          petNames: { 'pet-b': 'Luna' },
          dayCareRecurring: {
            'pet-b': { weekdays: [], startDate: d(2026, 9, 14) },
          },
        })
      )
      expect(error?.description).toContain('Luna')
      expect(error?.description).toContain('Wochentag')
      expect(error?.sectionId).toBe('daycare-recurring-pet-b')
    })

    it('lehnt Schließtag bei einmaliger Tagesbetreuung ab', () => {
      expectInvalidStep2(
        baseStep2({
          petLines: [
            { pet_id: 'pet-a', service_type: 'tagesbetreuung', day_care_mode: 'once' },
          ],
          petNames: { 'pet-a': 'Bello' },
          dayCareOnceDates: { 'pet-a': [d(2026, 9, 11)] },
          availability: CLOSED_2026_09_11,
        }),
        'Schließtag'
      )
    })
  })

  describe('Mehrere Tiere / gemischte Leistungen', () => {
    it('Hundepension + Tagesbetreuung einmalig (Screenshot-Szenario)', () => {
      expectValidStep2(
        baseStep2({
          petLines: [
            { pet_id: 'pet-a', service_type: 'hundepension' },
            { pet_id: 'pet-b', service_type: 'tagesbetreuung', day_care_mode: 'once' },
          ],
          petNames: { 'pet-a': 'Bello', 'pet-b': 'Luna' },
          dateRange: { from: d(2026, 9, 11), to: d(2026, 9, 14) },
          dayCareOnceDates: { 'pet-b': [d(2026, 9, 11), d(2026, 9, 14)] },
        })
      )
    })

    it('Hundepension ok, aber zweites Tier feste Wochentage ohne Mo–So → Fehler mit Tiername', () => {
      const error = validatePortalBookingStep2(
        baseStep2({
          petLines: [
            { pet_id: 'pet-a', service_type: 'hundepension' },
            { pet_id: 'pet-b', service_type: 'tagesbetreuung', day_care_mode: 'recurring' },
          ],
          petNames: { 'pet-a': 'Bello', 'pet-b': 'Luna' },
          dateRange: { from: d(2026, 9, 11), to: d(2026, 9, 14) },
          dayCareRecurring: { 'pet-b': { weekdays: [], startDate: d(2026, 9, 14) } },
        })
      )
      expect(error?.description).toContain('Luna')
      expect(error?.sectionId).toBe('daycare-recurring-pet-b')
    })

    it('zwei Hunde Urlaubsbetreuung im gleichen Zeitraum', () => {
      expectValidStep2(
        baseStep2({
          petLines: [
            { pet_id: 'pet-a', service_type: 'hundepension' },
            { pet_id: 'pet-b', service_type: 'hundepension' },
          ],
          dateRange: { from: d(2026, 9, 11), to: d(2026, 9, 20) },
        })
      )
    })

    it('Katze + Hund Tagesbetreuung einmalig an unterschiedlichen Tagen', () => {
      expectValidStep2(
        baseStep2({
          petLines: [
            { pet_id: 'pet-c', service_type: 'katzenbetreuung' },
            { pet_id: 'pet-a', service_type: 'tagesbetreuung', day_care_mode: 'once' },
          ],
          dateRange: { from: d(2026, 9, 11), to: d(2026, 9, 14) },
          dayCareOnceDates: { 'pet-a': [d(2026, 9, 12), d(2026, 9, 13)] },
          dropOffTime: '07:00',
          pickUpTime: '17:00',
        })
      )
    })

    it('Hundepension + feste Wochentage (beide vollständig)', () => {
      expectValidStep2(
        baseStep2({
          petLines: [
            { pet_id: 'pet-a', service_type: 'hundepension' },
            { pet_id: 'pet-b', service_type: 'tagesbetreuung', day_care_mode: 'recurring' },
          ],
          dateRange: { from: d(2026, 9, 11), to: d(2026, 9, 14) },
          dayCareRecurring: {
            'pet-b': { weekdays: [3], startDate: d(2026, 9, 16), intervalWeeks: 2 },
          },
        })
      )
    })
  })

  describe('Bring-/Holzeiten', () => {
    it('fehlende Zeiten bei Tagesbetreuung', () => {
      expectInvalidStep2(
        baseStep2({
          petLines: [
            { pet_id: 'pet-a', service_type: 'tagesbetreuung', day_care_mode: 'once' },
          ],
          dayCareOnceDates: { 'pet-a': [d(2026, 9, 14)] },
          dropOffTime: '',
          pickUpTime: '17:00',
        }),
        'Bring- und Holzeiten'
      )
    })

    it('ungültiges Zeitformat', () => {
      expectInvalidStep2(
        baseStep2({
          petLines: [{ pet_id: 'pet-a', service_type: 'hundepension' }],
          dateRange: { from: d(2026, 9, 11), to: d(2026, 9, 14) },
          dropOffTime: '7:00',
          pickUpTime: '17:00',
        }),
        'HH:MM'
      )
    })
  })
})

describe('Portal-Buchungsflow – Payload & Server-Validierung', () => {
  const groupRange = { start_date: '2026-09-11', end_date: '2026-09-14' }

  it('baut Payload für gemischte Mehrfach-Buchung', () => {
    const payload = buildPortalBookingPetsPayload(
      [
        { pet_id: 'pet-a', service_type: 'hundepension' },
        { pet_id: 'pet-b', service_type: 'tagesbetreuung', day_care_mode: 'once' },
        { pet_id: 'pet-c', service_type: 'tagesbetreuung', day_care_mode: 'recurring' },
      ],
      { 'pet-b': [d(2026, 9, 11), d(2026, 9, 14)] },
      { 'pet-c': { weekdays: [5], startDate: d(2026, 9, 11), intervalWeeks: 2 } }
    )

    expect(payload).toEqual([
      { pet_id: 'pet-a', service_type: 'hundepension' },
      {
        pet_id: 'pet-b',
        service_type: 'tagesbetreuung',
        day_care_mode: 'once',
        selected_dates: ['2026-09-11', '2026-09-14'],
      },
      {
        pet_id: 'pet-c',
        service_type: 'tagesbetreuung',
        day_care_mode: 'recurring',
        day_care_weekdays: [5],
        day_care_interval_weeks: 2,
        start_date: '2026-09-11',
        end_date: null,
      },
    ])

    expect(validatePortalPetLines(payload as PortalPetBookingLine[], [], groupRange)).toEqual({
      valid: true,
    })
  })

  it('erzeugt DB-Zeilen für alle Service-Typen', () => {
    const lines: PortalPetBookingLine[] = [
      { pet_id: 'pet-a', service_type: 'hundepension' },
      {
        pet_id: 'pet-b',
        service_type: 'tagesbetreuung',
        day_care_mode: 'once',
        selected_dates: ['2026-09-11', '2026-09-14'],
      },
      {
        pet_id: 'pet-c',
        service_type: 'tagesbetreuung',
        day_care_mode: 'recurring',
        day_care_weekdays: [1, 3],
        day_care_interval_weeks: 1,
        start_date: '2026-09-14',
      },
      { pet_id: 'pet-d', service_type: 'katzenbetreuung' },
    ]

    const pensionRow = buildBookingInsertRow(lines[0], groupRange, 'cust-1', 'grp-1', null)
    expect(pensionRow.start_date).toBe('2026-09-11')
    expect(pensionRow.end_date).toBe('2026-09-14')
    expect(pensionRow.day_care_mode).toBeNull()

    const onceRow = buildBookingInsertRow(lines[1], groupRange, 'cust-1', 'grp-1', null)
    expect(onceRow.day_care_mode).toBe('once')
    expect(onceRow.selected_dates).toEqual(['2026-09-11', '2026-09-14'])
    expect(onceRow.start_date).toBe('2026-09-11')
    expect(onceRow.end_date).toBe('2026-09-14')

    const recurringRow = buildBookingInsertRow(lines[2], groupRange, 'cust-1', 'grp-1', null)
    expect(recurringRow.day_care_mode).toBe('recurring')
    expect(recurringRow.day_care_weekdays).toEqual([1, 3])
    expect(recurringRow.end_date).toBeNull()

    const catRow = buildBookingInsertRow(lines[3], groupRange, 'cust-1', 'grp-1', null)
    expect(catRow.service_type).toBe('katzenbetreuung')
    expect(catRow.start_date).toBe('2026-09-11')
  })

  it('erzeugt zwei Pension-Zeilen bei zwei Blöcken', () => {
    const rows = buildBookingInsertRows(
      { pet_id: 'pet-a', service_type: 'hundepension' },
      [
        { start_date: '2026-09-11', end_date: '2026-09-14' },
        { start_date: '2026-09-20', end_date: '2026-09-22' },
      ],
      null,
      'cust-1',
      'grp-1',
      null
    )
    expect(rows).toHaveLength(2)
  })

  it('Schritt 2: mehrere Betreuungsblöcke für Pension', () => {
    expectValidStep2(
      baseStep2({
        petLines: [{ pet_id: 'pet-a', service_type: 'hundepension' }],
        dateBlocks: [
          { from: d(2026, 9, 11), to: d(2026, 9, 14) },
          { from: d(2026, 9, 20), to: d(2026, 9, 22) },
        ],
      })
    )
  })

  it('Schritt 2: recurring mit Enddatum', () => {
    expectValidStep2(
      baseStep2({
        petLines: [
          { pet_id: 'pet-a', service_type: 'tagesbetreuung', day_care_mode: 'recurring' },
        ],
        dayCareRecurring: {
          'pet-a': {
            weekdays: [1, 5],
            startDate: d(2026, 9, 14),
            endDate: d(2026, 10, 14),
            unbefristet: false,
            intervalWeeks: 1,
          },
        },
      })
    )
  })

  it('Server lehnt recurring ohne Wochentage ab', () => {
    const result = validatePortalPetLines(
      [
        {
          pet_id: 'pet-b',
          service_type: 'tagesbetreuung',
          day_care_mode: 'recurring',
          start_date: '2026-09-14',
          day_care_weekdays: [],
        },
      ],
      [],
      null
    )
    expect(result.valid).toBe(false)
  })

  it('Server lehnt Pension ohne Gruppenzeitraum ab', () => {
    const result = validatePortalPetLines(
      [{ pet_id: 'pet-a', service_type: 'hundepension' }],
      [],
      null
    )
    expect(result.valid).toBe(false)
  })
})

describe('Portal-Buchungsflow – Bring-/Holzeiten Span', () => {
  it('nutzt Hundepension-Zeitraum bei gemischter Buchung', () => {
    const span = resolvePickupDateSpanFromPortalLines(
      [
        { pet_id: 'pet-a', service_type: 'hundepension' },
        {
          pet_id: 'pet-b',
          service_type: 'tagesbetreuung',
          day_care_mode: 'once',
          selected_dates: ['2026-09-11', '2026-09-14'],
        },
      ],
      { start_date: '2026-09-11', end_date: '2026-09-14' }
    )
    expect(span).toEqual({ start: '2026-09-11', end: '2026-09-14' })
  })

  it('nutzt min/max der Einmaltage ohne Pension', () => {
    const span = resolvePickupDateSpanFromPortalLines(
      [
        {
          pet_id: 'pet-a',
          service_type: 'tagesbetreuung',
          day_care_mode: 'once',
          selected_dates: ['2026-09-11', '2026-09-14'],
        },
      ],
      null
    )
    expect(span).toEqual({ start: '2026-09-11', end: '2026-09-14' })
  })

  it('nutzt Horizont-Ende bei unbefristeten festen Wochentagen', () => {
    const span = resolvePickupDateSpanFromPortalLines(
      [
        {
          pet_id: 'pet-a',
          service_type: 'tagesbetreuung',
          day_care_mode: 'recurring',
          day_care_weekdays: [5],
          start_date: '2026-09-11',
        },
      ],
      null
    )
    expect(span?.start).toBe('2026-09-11')
    expect(span?.end).toBe('2027-09-11')
  })

  it('nutzt Enddatum bei befristeten festen Wochentagen', () => {
    const span = resolvePickupDateSpanFromPortalLines(
      [
        {
          pet_id: 'pet-a',
          service_type: 'tagesbetreuung',
          day_care_mode: 'recurring',
          day_care_weekdays: [5],
          start_date: '2026-09-11',
          end_date: '2026-10-15',
        },
      ],
      null
    )
    expect(span).toEqual({ start: '2026-09-11', end: '2026-10-15' })
  })
})
