import { isDateInVacationPeriods, iterateIsoDateRange } from '@/lib/booking-availability'
import {
  type BookingDateBlock,
  envelopeFromBlocks,
  validateDateBlocks,
} from '@/lib/booking-date-blocks'
import { isRangeService } from '@/lib/day-care-booking'
import { expandRecurringDayCareDates } from '@/lib/day-care-interval'
import { isValidTimeHHmm } from '@/lib/pickup-time-surcharge'
import type { DayCareMode, ServiceType } from '@/lib/types'
import { startOfDay, toIsoDate } from '@/lib/vacation-dates'

export type PortalBookingStep2PetLine = {
  pet_id: string
  service_type: ServiceType | ''
  day_care_mode?: DayCareMode | ''
}

export type PortalBookingStep2DateBlockUI = {
  from?: Date
  to?: Date
  weekdays?: number[]
}

export type PortalBookingStep2Availability = {
  closedDates: string[]
  vacationPeriods: Array<{ start_date: string; end_date: string; label?: string }>
}

export type PortalBookingStep2Input = {
  petLines: PortalBookingStep2PetLine[]
  petNames: Record<string, string>
  /** @deprecated use dateBlocks – kept for backward compat in tests */
  dateRange?: { from?: Date; to?: Date }
  dateBlocks?: PortalBookingStep2DateBlockUI[]
  dayCareOnceDates: Record<string, Date[]>
  dayCareRecurring: Record<
    string,
    {
      weekdays: number[]
      startDate?: Date
      endDate?: Date
      unbefristet?: boolean
      intervalWeeks?: 1 | 2
    }
  >
  dropOffTime: string
  pickUpTime: string
  availability: PortalBookingStep2Availability
}

export type PortalBookingStep2Error = {
  description: string
  sectionId?: string
}

function resolvePetLines(petLines: PortalBookingStep2PetLine[]) {
  return petLines.filter((line) => line.pet_id && line.service_type)
}

function petName(petNames: Record<string, string>, petId: string): string {
  return petNames[petId] ?? 'dieses Tier'
}

function datesBlocked(
  isoDates: string[],
  availability: PortalBookingStep2Availability
): boolean {
  return isoDates.some((date) => {
    if (availability.closedDates.includes(date)) return true
    return isDateInVacationPeriods(date, availability.vacationPeriods)
  })
}

export function dateBlocksToIso(blocks: PortalBookingStep2DateBlockUI[]): BookingDateBlock[] {
  const result: BookingDateBlock[] = []
  for (const block of blocks) {
    const from = block.from
    const to = block.to ?? block.from
    if (!from || !to) continue
    const start_date = toIsoDate(startOfDay(from))
    const end_date = toIsoDate(startOfDay(to))
    result.push({
      start_date,
      end_date,
      ...(block.weekdays?.length ? { weekdays: block.weekdays } : {}),
    })
  }
  return result
}

export function resolveStep2DateBlocks(input: PortalBookingStep2Input): BookingDateBlock[] {
  if (input.dateBlocks?.length) {
    return dateBlocksToIso(input.dateBlocks)
  }
  const from = input.dateRange?.from
  const to = input.dateRange?.to ?? input.dateRange?.from
  if (from && to) {
    return [
      {
        start_date: toIsoDate(startOfDay(from)),
        end_date: toIsoDate(startOfDay(to)),
      },
    ]
  }
  return []
}

export function validatePortalBookingStep2(
  input: PortalBookingStep2Input
): PortalBookingStep2Error | null {
  const resolved = resolvePetLines(input.petLines)
  const rangePetLines = resolved.filter((l) => isRangeService(l.service_type as ServiceType))
  const dayCareOnceLines = resolved.filter(
    (l) => l.service_type === 'tagesbetreuung' && l.day_care_mode === 'once'
  )
  const dayCareRecurringLines = resolved.filter(
    (l) => l.service_type === 'tagesbetreuung' && l.day_care_mode === 'recurring'
  )
  const needsPickupTimes = resolved.some(
    (l) => l.service_type === 'hundepension' || l.service_type === 'tagesbetreuung'
  )

  if (rangePetLines.length > 0) {
    const isoBlocks = resolveStep2DateBlocks(input)
    const blockValidation = validateDateBlocks(isoBlocks)
    if (!blockValidation.valid) {
      return { description: blockValidation.error }
    }
    for (const block of isoBlocks) {
      if (datesBlocked(iterateIsoDateRange(block.start_date, block.end_date), input.availability)) {
        return {
          description:
            'Ein gewählter Betreuungsblock ist wegen Betriebsferien oder Schließtagen nicht verfügbar.',
        }
      }
    }
  }

  for (const line of dayCareOnceLines) {
    const dates = input.dayCareOnceDates[line.pet_id] || []
    const name = petName(input.petNames, line.pet_id)
    const sectionId = `daycare-once-${line.pet_id}`
    if (dates.length === 0) {
      return {
        sectionId,
        description: `Für ${name}: Bitte wähle mindestens einen Betreuungstag im Kalender oder übernimm Tage aus einem Zeitfenster.`,
      }
    }
    const isoList = dates.map((d) => toIsoDate(startOfDay(d)))
    if (datesBlocked(isoList, input.availability)) {
      return {
        sectionId,
        description: `Für ${name}: Ein gewählter Tag ist wegen Ferien oder Schließtag nicht verfügbar.`,
      }
    }
  }

  for (const line of dayCareRecurringLines) {
    const cfg = input.dayCareRecurring[line.pet_id]
    const name = petName(input.petNames, line.pet_id)
    const sectionId = `daycare-recurring-${line.pet_id}`
    if (!cfg?.weekdays?.length) {
      return {
        sectionId,
        description: `Für ${name}: Bitte wähle mindestens einen Wochentag (Mo–So) bei „Feste Wochentage“.`,
      }
    }
    if (!cfg.startDate) {
      return {
        sectionId,
        description: `Für ${name}: Bitte wähle ein Startdatum für die festen Tage.`,
      }
    }
    const startIso = toIsoDate(startOfDay(cfg.startDate))
    const unbefristet = cfg.unbefristet !== false && !cfg.endDate
    if (!unbefristet && cfg.endDate) {
      const endIso = toIsoDate(startOfDay(cfg.endDate))
      if (endIso < startIso) {
        return {
          sectionId,
          description: `Für ${name}: Das Enddatum muss am oder nach dem Startdatum liegen.`,
        }
      }
      if (datesBlocked([startIso, endIso], input.availability)) {
        return {
          sectionId,
          description: `Für ${name}: Start- oder Enddatum ist wegen Ferien oder Schließtag nicht verfügbar.`,
        }
      }
    } else if (datesBlocked([startIso], input.availability)) {
      return {
        sectionId,
        description: `Für ${name}: Das Startdatum ist wegen Ferien oder Schließtag nicht verfügbar.`,
      }
    }
  }

  if (
    rangePetLines.length === 0 &&
    dayCareOnceLines.length === 0 &&
    dayCareRecurringLines.length === 0
  ) {
    return { description: 'Bitte wähle Termine für die Betreuung.' }
  }

  if (needsPickupTimes) {
    if (!input.dropOffTime.trim() || !input.pickUpTime.trim()) {
      return {
        description:
          'Bitte gib Bring- und Holzeiten für Hundepension oder Tagesbetreuung an.',
      }
    }
    if (!isValidTimeHHmm(input.dropOffTime) || !isValidTimeHHmm(input.pickUpTime)) {
      return {
        description: 'Bring- und Holzeiten müssen im Format HH:MM sein.',
      }
    }
  }

  return null
}

export function buildPortalBookingPetsPayload(
  petLines: PortalBookingStep2PetLine[],
  dayCareOnceDates: Record<string, Date[]>,
  dayCareRecurring: Record<
    string,
    {
      weekdays: number[]
      startDate?: Date
      endDate?: Date
      unbefristet?: boolean
      intervalWeeks?: 1 | 2
    }
  >
) {
  return resolvePetLines(petLines).map((line) => {
    if (line.service_type === 'tagesbetreuung' && line.day_care_mode === 'once') {
      return {
        pet_id: line.pet_id,
        service_type: line.service_type,
        day_care_mode: 'once' as const,
        selected_dates: (dayCareOnceDates[line.pet_id] || [])
          .map((d) => toIsoDate(startOfDay(d)))
          .sort(),
      }
    }
    if (line.service_type === 'tagesbetreuung' && line.day_care_mode === 'recurring') {
      const cfg = dayCareRecurring[line.pet_id]
      const unbefristet = cfg?.unbefristet !== false && !cfg?.endDate
      return {
        pet_id: line.pet_id,
        service_type: line.service_type,
        day_care_mode: 'recurring' as const,
        day_care_weekdays: cfg?.weekdays || [],
        day_care_interval_weeks: cfg?.intervalWeeks === 2 ? (2 as const) : (1 as const),
        start_date: cfg?.startDate ? toIsoDate(startOfDay(cfg.startDate)) : undefined,
        end_date:
          !unbefristet && cfg?.endDate ? toIsoDate(startOfDay(cfg.endDate)) : null,
      }
    }
    return {
      pet_id: line.pet_id,
      service_type: line.service_type,
    }
  })
}

export function buildPortalBookingDateBlocksPayload(
  input: PortalBookingStep2Input
): BookingDateBlock[] {
  return resolveStep2DateBlocks(input)
}

export function buildPortalBookingEnvelope(
  input: PortalBookingStep2Input
): { start_date: string; end_date: string } | null {
  const blocks = resolveStep2DateBlocks(input)
  if (blocks.length > 0) return envelopeFromBlocks(blocks)

  const onceLines = resolvePetLines(input.petLines).filter(
    (l) => l.service_type === 'tagesbetreuung' && l.day_care_mode === 'once'
  )
  const allOnce: string[] = []
  for (const line of onceLines) {
    for (const d of input.dayCareOnceDates[line.pet_id] || []) {
      allOnce.push(toIsoDate(startOfDay(d)))
    }
  }
  if (allOnce.length > 0) {
    const sorted = [...allOnce].sort()
    return { start_date: sorted[0], end_date: sorted[sorted.length - 1] }
  }

  return null
}

/** Sample dates for recurring availability check (bounded). */
export function sampleRecurringDatesForValidation(cfg: {
  weekdays: number[]
  startDate: Date
  endDate?: Date
  unbefristet?: boolean
  intervalWeeks?: 1 | 2
}): string[] {
  const startIso = toIsoDate(startOfDay(cfg.startDate))
  const endIso =
    cfg.unbefristet !== false && !cfg.endDate
      ? null
      : cfg.endDate
        ? toIsoDate(startOfDay(cfg.endDate))
        : null
  return expandRecurringDayCareDates(
    startIso,
    endIso,
    cfg.weekdays,
    cfg.intervalWeeks ?? 1
  )
}
