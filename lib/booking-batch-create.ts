import type { ServiceType, DayCareMode } from '@/lib/types'
import {
  isRangeService,
  minMaxIsoDates,
  validateDayCarePetPayload,
  type DayCarePetPayload,
} from '@/lib/day-care-booking'

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
    selected_dates: line.selected_dates as string[] | undefined,
    start_date: line.start_date as string | undefined,
    end_date: line.end_date as string | undefined | null,
  }))
}

export function buildBookingInsertRow(
  line: PortalPetBookingLine,
  groupRange: { start_date: string; end_date: string } | null,
  customerId: string,
  requestGroupId: string,
  message: string | null
): Record<string, unknown> {
  const base = {
    customer_id: customerId,
    pet_id: line.pet_id,
    service_type: line.service_type,
    message,
    status: 'pending',
    request_group_id: requestGroupId,
  }

  if (line.service_type === 'tagesbetreuung') {
    if (line.day_care_mode === 'once' && line.selected_dates?.length) {
      const bounds = minMaxIsoDates(line.selected_dates)!
      return {
        ...base,
        day_care_mode: 'once',
        selected_dates: line.selected_dates,
        day_care_weekdays: null,
        start_date: bounds.start,
        end_date: bounds.end,
      }
    }

    if (line.day_care_mode === 'recurring' && line.start_date) {
      return {
        ...base,
        day_care_mode: 'recurring',
        day_care_weekdays: line.day_care_weekdays,
        selected_dates: null,
        start_date: line.start_date,
        end_date: null,
      }
    }
  }

  if (!groupRange) {
    throw new Error('Zeitraum für Pension/Katzenbetreuung fehlt.')
  }

  return {
    ...base,
    day_care_mode: null,
    day_care_weekdays: null,
    selected_dates: null,
    start_date: groupRange.start_date,
    end_date: groupRange.end_date,
  }
}

export function validatePortalPetLines(
  lines: PortalPetBookingLine[],
  groupRange: { start_date: string; end_date: string } | null
): { valid: true } | { valid: false; error: string } {
  for (const line of lines) {
    const dc = validateDayCarePetPayload(line)
    if (!dc.valid) return dc

    if (isRangeService(line.service_type)) {
      if (!groupRange?.start_date || !groupRange?.end_date) {
        return { valid: false, error: 'Bitte wähle einen Zeitraum für die Betreuung.' }
      }
      if (groupRange.end_date < groupRange.start_date) {
        return { valid: false, error: 'Enddatum muss nach Startdatum liegen.' }
      }
    }
  }

  return { valid: true }
}
