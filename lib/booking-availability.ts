import {
  findOverlappingVacation,
  formatVacationDisplay,
  parseIsoDate,
  toIsoDate,
  type VacationDate,
} from '@/lib/vacation-dates'
import type { CapacityOverride, CapacitySetting, ServiceType } from '@/lib/types'

export type AvailabilityConflictReason =
  | 'vacation'
  | 'closed'
  | 'capacity_overall'
  | 'capacity_service'

export interface ApprovedBookingSlice {
  id?: string
  service_type: ServiceType
  start_date: string
  end_date: string
}

export interface AvailabilityContext {
  vacations: VacationDate[]
  capacitySettings: CapacitySetting[]
  capacityOverrides: CapacityOverride[]
  approvedBookings: ApprovedBookingSlice[]
}

export interface AvailabilityConflict {
  reason: AvailabilityConflictReason
  date?: string
  message: string
}

export interface ValidateBookingOptions {
  serviceType: ServiceType
  startDate: string
  endDate: string
  excludeBookingId?: string
  checkCapacity: boolean
}

export interface ValidateBookingResult {
  valid: boolean
  conflicts: AvailabilityConflict[]
  error?: string
}

export function iterateIsoDateRange(startDate: string, endDate: string): string[] {
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)

  if (!start || !end || end < start) {
    return []
  }

  const dates: string[] = []
  const current = new Date(start)

  while (current <= end) {
    dates.push(toIsoDate(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function getCapacityLimit(
  date: string,
  serviceType: ServiceType | null,
  settings: CapacitySetting[],
  overrides: CapacityOverride[]
): number | null {
  const override = overrides.find(
    (entry) => entry.date === date && entry.service_type === serviceType
  )

  if (override) {
    return override.capacity
  }

  const setting = settings.find((entry) => entry.service_type === serviceType)
  return setting?.default_capacity ?? null
}

export function isDayClosed(
  date: string,
  serviceType: ServiceType,
  settings: CapacitySetting[],
  overrides: CapacityOverride[]
): boolean {
  const overallLimit = getCapacityLimit(date, null, settings, overrides)
  if (overallLimit === 0) {
    return true
  }

  const serviceLimit = getCapacityLimit(date, serviceType, settings, overrides)
  return serviceLimit === 0
}

export function getClosedReason(
  date: string,
  serviceType: ServiceType,
  overrides: CapacityOverride[]
): string | null {
  const overallOverride = overrides.find(
    (entry) => entry.date === date && entry.service_type === null && entry.capacity === 0
  )
  if (overallOverride?.reason) {
    return overallOverride.reason
  }

  const serviceOverride = overrides.find(
    (entry) =>
      entry.date === date && entry.service_type === serviceType && entry.capacity === 0
  )

  return serviceOverride?.reason ?? null
}

export function countApprovedBookingsOnDate(
  date: string,
  serviceType: ServiceType | null,
  bookings: ApprovedBookingSlice[],
  excludeBookingId?: string
): number {
  return bookings.filter((booking) => {
    if (excludeBookingId && booking.id === excludeBookingId) {
      return false
    }

    if (date < booking.start_date || date > booking.end_date) {
      return false
    }

    if (serviceType && booking.service_type !== serviceType) {
      return false
    }

    return true
  }).length
}

function formatGermanDate(date: string): string {
  const parsed = parseIsoDate(date)
  if (!parsed) {
    return date
  }

  return parsed.toLocaleDateString('de-DE')
}

function getServiceLabel(serviceType: ServiceType): string {
  switch (serviceType) {
    case 'hundepension':
      return 'Urlaubsbetreuung'
    case 'katzenbetreuung':
      return 'Katzenbetreuung'
    case 'tagesbetreuung':
      return 'Tagesbetreuung'
    default:
      return serviceType
  }
}

export function formatAvailabilityError(conflicts: AvailabilityConflict[]): string {
  const conflict = conflicts[0]
  if (!conflict) {
    return 'Der gewählte Zeitraum ist nicht verfügbar.'
  }

  switch (conflict.reason) {
    case 'vacation':
      return `Buchungen sind im Betriebsferienzeitraum (${conflict.message}) nicht möglich.`
    case 'closed':
      return conflict.date
        ? `Am ${formatGermanDate(conflict.date)} ist keine Betreuung möglich${conflict.message ? `: ${conflict.message}` : ''}.`
        : `Im gewählten Zeitraum ist keine Betreuung möglich${conflict.message ? `: ${conflict.message}` : ''}.`
    case 'capacity_overall':
      return conflict.date
        ? `Am ${formatGermanDate(conflict.date)} ist die Gesamtkapazität ausgeschöpft (${conflict.message}).`
        : `Im gewählten Zeitraum ist die Gesamtkapazität ausgeschöpft (${conflict.message}).`
    case 'capacity_service':
      return conflict.date
        ? `Am ${formatGermanDate(conflict.date)} ist die Kapazität ausgeschöpft (${conflict.message}).`
        : `Im gewählten Zeitraum ist die Service-Kapazität ausgeschöpft (${conflict.message}).`
    default:
      return 'Der gewählte Zeitraum ist nicht verfügbar.'
  }
}

function buildCapacityConflictMessage(current: number, max: number): string {
  return `${current}/${max}`
}

export function validateBookingAvailability(
  context: AvailabilityContext,
  options: ValidateBookingOptions
): ValidateBookingResult {
  const { serviceType, startDate, endDate, excludeBookingId, checkCapacity } = options
  const conflicts: AvailabilityConflict[] = []

  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)

  if (!start || !end || end < start) {
    return {
      valid: false,
      conflicts: [],
      error: 'Ungültiger Buchungszeitraum.',
    }
  }

  const overlappingVacation = findOverlappingVacation(context.vacations, start, end)
  if (overlappingVacation) {
    conflicts.push({
      reason: 'vacation',
      message: formatVacationDisplay(overlappingVacation),
    })
  }

  for (const date of iterateIsoDateRange(startDate, endDate)) {
    if (isDayClosed(date, serviceType, context.capacitySettings, context.capacityOverrides)) {
      conflicts.push({
        reason: 'closed',
        date,
        message: getClosedReason(date, serviceType, context.capacityOverrides) || '',
      })
      continue
    }

    if (!checkCapacity) {
      continue
    }

    const overallMax = getCapacityLimit(
      date,
      null,
      context.capacitySettings,
      context.capacityOverrides
    )
    const serviceMax = getCapacityLimit(
      date,
      serviceType,
      context.capacitySettings,
      context.capacityOverrides
    )

    if (overallMax !== null && overallMax > 0) {
      const overallCurrent = countApprovedBookingsOnDate(
        date,
        null,
        context.approvedBookings,
        excludeBookingId
      )

      if (overallCurrent + 1 > overallMax) {
        conflicts.push({
          reason: 'capacity_overall',
          date,
          message: buildCapacityConflictMessage(overallCurrent + 1, overallMax),
        })
      }
    }

    if (serviceMax !== null && serviceMax > 0) {
      const serviceCurrent = countApprovedBookingsOnDate(
        date,
        serviceType,
        context.approvedBookings,
        excludeBookingId
      )

      if (serviceCurrent + 1 > serviceMax) {
        conflicts.push({
          reason: 'capacity_service',
          date,
          message: `${getServiceLabel(serviceType)} ${buildCapacityConflictMessage(serviceCurrent + 1, serviceMax)}`,
        })
      }
    }
  }

  if (conflicts.length === 0) {
    return { valid: true, conflicts: [] }
  }

  return {
    valid: false,
    conflicts,
    error: formatAvailabilityError(conflicts),
  }
}

export function getBlockedDatesForService(
  context: AvailabilityContext,
  serviceType: ServiceType,
  fromDate: string,
  toDate: string
): string[] {
  const blocked = new Set<string>()

  for (const date of iterateIsoDateRange(fromDate, toDate)) {
    if (isDayClosed(date, serviceType, context.capacitySettings, context.capacityOverrides)) {
      blocked.add(date)
    }
  }

  return Array.from(blocked)
}

export function getVacationPeriodsInRange(
  vacations: VacationDate[],
  fromDate: string,
  toDate: string
): Array<{ start_date: string; end_date: string; label: string }> {
  const rangeStart = parseIsoDate(fromDate)
  const rangeEnd = parseIsoDate(toDate)

  if (!rangeStart || !rangeEnd) {
    return []
  }

  return vacations
    .map((vacation) => {
      const start = vacation.start_date
      const end = vacation.end_date
      if (!start || !end) {
        return null
      }

      if (end < fromDate || start > toDate) {
        return null
      }

      return {
        start_date: start,
        end_date: end,
        label: vacation.label || formatVacationDisplay(vacation),
      }
    })
    .filter((entry): entry is { start_date: string; end_date: string; label: string } => entry !== null)
}

export function isDateInVacationPeriods(
  date: string,
  periods: Array<{ start_date: string; end_date: string }>
): boolean {
  return periods.some((period) => date >= period.start_date && date <= period.end_date)
}
