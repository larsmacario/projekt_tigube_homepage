import { isDateInVacationPeriods, iterateIsoDateRange } from '@/lib/booking-availability'
import { isRangeService } from '@/lib/day-care-booking'
import { isValidTimeHHmm } from '@/lib/pickup-time-surcharge'
import type { DayCareMode, ServiceType } from '@/lib/types'
import { startOfDay, toIsoDate } from '@/lib/vacation-dates'

export type PortalBookingStep2PetLine = {
  pet_id: string
  service_type: ServiceType | ''
  day_care_mode?: DayCareMode | ''
}

export type PortalBookingStep2Availability = {
  closedDates: string[]
  vacationPeriods: Array<{ start_date: string; end_date: string; label?: string }>
}

export type PortalBookingStep2Input = {
  petLines: PortalBookingStep2PetLine[]
  petNames: Record<string, string>
  dateRange?: { from?: Date; to?: Date }
  dayCareOnceDates: Record<string, Date[]>
  dayCareRecurring: Record<
    string,
    { weekdays: number[]; startDate?: Date; intervalWeeks?: 1 | 2 }
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
    const startDate = input.dateRange?.from
    const endDate = input.dateRange?.to ?? input.dateRange?.from
    if (!startDate || !endDate) {
      return {
        description: 'Bitte wähle einen Zeitraum für Urlaubs- oder Katzenbetreuung.',
      }
    }
    const startIso = toIsoDate(startDate)
    const endIso = toIsoDate(endDate)
    if (datesBlocked(iterateIsoDateRange(startIso, endIso), input.availability)) {
      return {
        description:
          'Der gewählte Zeitraum ist wegen Betriebsferien oder Schließtagen nicht verfügbar.',
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
        description: `Für ${name}: Bitte wähle mindestens einen Betreuungstag im Kalender.`,
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
    if (datesBlocked([startIso], input.availability)) {
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
    { weekdays: number[]; startDate?: Date; intervalWeeks?: 1 | 2 }
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
      return {
        pet_id: line.pet_id,
        service_type: line.service_type,
        day_care_mode: 'recurring' as const,
        day_care_weekdays: cfg?.weekdays || [],
        day_care_interval_weeks: cfg?.intervalWeeks === 2 ? (2 as const) : (1 as const),
        start_date: cfg?.startDate ? toIsoDate(startOfDay(cfg.startDate)) : undefined,
      }
    }
    return {
      pet_id: line.pet_id,
      service_type: line.service_type,
    }
  })
}
