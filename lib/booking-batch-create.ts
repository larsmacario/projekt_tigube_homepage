import type { ServiceType, DayCareMode, DayCareIntervalWeeks } from '@/lib/types'
import type { BookingDateBlock } from '@/lib/booking-date-blocks'
import {
  isRangeService,
  minMaxIsoDates,
  validateDayCarePetPayload,
  type DayCarePetPayload,
} from '@/lib/day-care-booking'
import { normalizeDayCareIntervalWeeks } from '@/lib/day-care-interval'

export interface PortalPetBookingLine extends DayCarePetPayload {
  pet_id: string
  service_type: ServiceType
}

export function parsePortalPetLines(raw: unknown[]): PortalPetBookingLine[] {
  return raw.map((line: any) => ({
    pet_id: line.pet_id,
    service_type: line.service_type as ServiceType,
    day_care_mode: line.day_care_mode as DayCareMode | undefined,
    day_care_weekdays: line.day_care_weekdays as number[] | undefined,
    day_care_interval_weeks: line.day_care_interval_weeks as DayCareIntervalWeeks | undefined,
    selected_dates: line.selected_dates as string[] | undefined,
    start_date: line.start_date as string | undefined,
    end_date: line.end_date as string | undefined | null,
  }))
}

function bookingInsertBase(
  line: PortalPetBookingLine,
  customerId: string,
  requestGroupId: string,
  message: string | null
) {
  return {
    customer_id: customerId,
    pet_id: line.pet_id,
    service_type: line.service_type,
    message,
    status: 'pending' as const,
    request_group_id: requestGroupId,
  }
}

export function buildBookingInsertRows(
  line: PortalPetBookingLine,
  dateBlocks: BookingDateBlock[],
  groupRange: { start_date: string; end_date: string } | null,
  customerId: string,
  requestGroupId: string,
  message: string | null
): Record<string, unknown>[] {
  const base = bookingInsertBase(line, customerId, requestGroupId, message)

  if (line.service_type === 'tagesbetreuung') {
    if (line.day_care_mode === 'once' && line.selected_dates?.length) {
      const bounds = minMaxIsoDates(line.selected_dates)!
      return [
        {
          ...base,
          day_care_mode: 'once',
          selected_dates: line.selected_dates,
          day_care_weekdays: null,
          day_care_interval_weeks: null,
          start_date: bounds.start,
          end_date: bounds.end,
        },
      ]
    }

    if (line.day_care_mode === 'recurring' && line.start_date) {
      return [
        {
          ...base,
          day_care_mode: 'recurring',
          day_care_weekdays: line.day_care_weekdays,
          day_care_interval_weeks: normalizeDayCareIntervalWeeks(line.day_care_interval_weeks),
          selected_dates: null,
          start_date: line.start_date,
          end_date: line.end_date ?? null,
        },
      ]
    }
  }

  if (isRangeService(line.service_type)) {
    const blocks =
      dateBlocks.length > 0
        ? dateBlocks
        : groupRange
          ? [{ start_date: groupRange.start_date, end_date: groupRange.end_date }]
          : []

    if (blocks.length === 0) {
      throw new Error('Zeitraum für Pension/Katzenbetreuung fehlt.')
    }

    return blocks.map((block) => ({
      ...base,
      day_care_mode: null,
      day_care_weekdays: null,
      day_care_interval_weeks: null,
      selected_dates: null,
      start_date: block.start_date,
      end_date: block.end_date,
    }))
  }

  throw new Error('Unvollständige Buchungszeile.')
}

/** @deprecated Use buildBookingInsertRows */
export function buildBookingInsertRow(
  line: PortalPetBookingLine,
  groupRange: { start_date: string; end_date: string } | null,
  customerId: string,
  requestGroupId: string,
  message: string | null
): Record<string, unknown> {
  const rows = buildBookingInsertRows(
    line,
    [],
    groupRange,
    customerId,
    requestGroupId,
    message
  )
  if (rows.length !== 1) {
    throw new Error('buildBookingInsertRow erwartet genau eine Zeile.')
  }
  return rows[0]
}

export function validatePortalPetLines(
  lines: PortalPetBookingLine[],
  dateBlocks: BookingDateBlock[],
  groupRange: { start_date: string; end_date: string } | null
): { valid: true } | { valid: false; error: string } {
  const hasRangeBlocks =
    dateBlocks.length > 0 ||
    Boolean(groupRange?.start_date && groupRange?.end_date)

  for (const line of lines) {
    const dc = validateDayCarePetPayload(line)
    if (!dc.valid) return dc

    if (isRangeService(line.service_type)) {
      if (!hasRangeBlocks) {
        return { valid: false, error: 'Bitte wähle einen Zeitraum für die Betreuung.' }
      }
      const blocksToCheck =
        dateBlocks.length > 0
          ? dateBlocks
          : groupRange
            ? [{ start_date: groupRange.start_date, end_date: groupRange.end_date }]
            : []
      for (const block of blocksToCheck) {
        if (block.end_date < block.start_date) {
          return { valid: false, error: 'Enddatum muss nach Startdatum liegen.' }
        }
      }
    }
  }

  return { valid: true }
}
