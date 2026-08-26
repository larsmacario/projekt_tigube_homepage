import { isoWeekdayFromIsoDate } from '@/lib/day-care-interval'
import type { SpringerOffer, SpringerOfferStatus, SpringerRegistration } from '@/lib/types'

const ACCEPTABLE_OFFER_STATUSES: SpringerOfferStatus[] = ['sent', 'draft']

export function matchRegistrationsForDate<T extends Pick<SpringerRegistration, 'weekdays' | 'is_active'>>(
  registrations: T[],
  offerDate: string
): T[] {
  const weekday = isoWeekdayFromIsoDate(offerDate)
  if (weekday < 1 || weekday > 7) return []

  return registrations.filter(
    (registration) =>
      registration.is_active &&
      Array.isArray(registration.weekdays) &&
      registration.weekdays.includes(weekday)
  )
}

export function isOfferAcceptable(
  offer: Pick<SpringerOffer, 'status'> | { status: SpringerOfferStatus }
): boolean {
  return ACCEPTABLE_OFFER_STATUSES.includes(offer.status)
}

export function buildSpringerOfferUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/portal/springer/offers/${token}`
}

export function normalizeSpringerWeekdays(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null
  const weekdays = [
    ...new Set(
      raw
        .map((value) => (typeof value === 'number' ? value : Number(value)))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7)
    ),
  ].sort((a, b) => a - b)

  return weekdays.length > 0 ? weekdays : null
}

export function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://tierischgutbetreut.de'
}
