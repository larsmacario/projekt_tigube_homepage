import { type DateRange } from 'react-day-picker'

import type { DayCareMode, ServiceType } from '@/lib/types'
import { parseIsoDate, startOfDay, toIsoDate } from '@/lib/vacation-dates'
import type { PortalPetBookingLine } from '@/lib/booking-batch-create'

export function resolvePickupDateSpanFromPortalLines(
  petLines: PortalPetBookingLine[],
  groupRange: { start_date: string; end_date: string } | null
): { start: string; end: string } | null {
  let dateRange: DateRange | undefined

  if (groupRange && petLines.some((l) => l.service_type === 'hundepension')) {
    dateRange = {
      from: parseIsoDate(groupRange.start_date),
      to: parseIsoDate(groupRange.end_date),
    }
  }

  const dayCareOnceDates: Record<string, Date[]> = {}
  const dayCareRecurring: Record<string, { weekdays: number[]; startDate?: Date }> = {}

  for (const line of petLines) {
    if (
      line.service_type === 'tagesbetreuung' &&
      line.day_care_mode === 'once' &&
      line.selected_dates?.length
    ) {
      dayCareOnceDates[line.pet_id] = line.selected_dates.map((d) => parseIsoDate(d))
    }
    if (
      line.service_type === 'tagesbetreuung' &&
      line.day_care_mode === 'recurring' &&
      line.start_date
    ) {
      dayCareRecurring[line.pet_id] = {
        weekdays: line.day_care_weekdays ?? [],
        startDate: parseIsoDate(line.start_date),
      }
    }
  }

  return resolvePickupDateSpan({
    petLines,
    dateRange,
    dayCareOnceDates,
    dayCareRecurring,
  })
}

export type PickupDateSpanPetLine = {
  pet_id: string
  service_type: ServiceType | ''
  day_care_mode?: DayCareMode | ''
}

export type PickupDateSpanInput = {
  petLines: PickupDateSpanPetLine[]
  dateRange?: DateRange
  dayCareOnceDates: Record<string, Date[]>
  dayCareRecurring: Record<string, { weekdays: number[]; startDate?: Date }>
}

export function resolvePickupDateSpan(input: PickupDateSpanInput): { start: string; end: string } | null {
  if (
    input.petLines.some((l) => l.service_type === 'hundepension') &&
    input.dateRange?.from
  ) {
    return {
      start: toIsoDate(input.dateRange.from),
      end: toIsoDate(input.dateRange.to ?? input.dateRange.from),
    }
  }

  const oncePetIds = input.petLines
    .filter((l) => l.service_type === 'tagesbetreuung' && l.day_care_mode === 'once')
    .map((l) => l.pet_id)

  if (oncePetIds.length > 0) {
    const allDates: string[] = []
    for (const petId of oncePetIds) {
      for (const d of input.dayCareOnceDates[petId] || []) {
        allDates.push(toIsoDate(startOfDay(d)))
      }
    }
    if (allDates.length === 0) return null
    allDates.sort()
    return { start: allDates[0], end: allDates[allDates.length - 1] }
  }

  const recurringPetIds = input.petLines
    .filter((l) => l.service_type === 'tagesbetreuung' && l.day_care_mode === 'recurring')
    .map((l) => l.pet_id)

  if (recurringPetIds.length > 0) {
    const starts: string[] = []
    for (const petId of recurringPetIds) {
      const d = input.dayCareRecurring[petId]?.startDate
      if (d) starts.push(toIsoDate(startOfDay(d)))
    }
    if (starts.length === 0) return null
    starts.sort()
    return { start: starts[0], end: starts[starts.length - 1] }
  }

  return null
}
