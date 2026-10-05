import { parseIsoDate, startOfDay, toIsoDate } from '@/lib/vacation-dates'

/** Buchbar bis einschließlich 31.12. des Folgejahres (Europe/Berlin, lokales Datum). */
export function getBookingHorizonEndDate(reference: Date = new Date()): Date {
  const ref = startOfDay(reference)
  const year = ref.getFullYear() + 1
  return startOfDay(new Date(year, 11, 31))
}

export function getBookingHorizonEndIso(reference: Date = new Date()): string {
  return toIsoDate(getBookingHorizonEndDate(reference))
}

export function isAfterBookingHorizon(isoDate: string, reference: Date = new Date()): boolean {
  const parsed = parseIsoDate(isoDate)
  if (!parsed) return true
  return startOfDay(parsed) > getBookingHorizonEndDate(reference)
}

export function isWithinBookingHorizon(isoDate: string, reference: Date = new Date()): boolean {
  return !isAfterBookingHorizon(isoDate, reference)
}
