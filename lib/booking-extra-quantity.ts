import { type DateRange } from 'react-day-picker'

import { iterateIsoDateRange } from '@/lib/booking-availability'
import type { BookingExtraPrice } from '@/lib/booking-extras'
import type { DayCareMode, ServiceType } from '@/lib/types'
import { startOfDay, toIsoDate } from '@/lib/vacation-dates'

export type ExtraQuantityBehavior =
  | 'syncPeriod'
  | 'syncPeriodFeedings'
  | 'manual'
  | 'fixedOne'

export interface PetLineForExtraQuantity {
  pet_id: string
  service_type: ServiceType
  day_care_mode?: DayCareMode | ''
}

const FEEDINGS_PER_DAY_PATTERN =
  /(\d+)\s*fütterung(?:en)?\s*pro\s*tag/i

function priceTextBlob(price: BookingExtraPrice): string {
  return [price.name, price.description, price.unit, price.note]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function containsAny(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n))
}

export function parseFeedingsPerDay(price: BookingExtraPrice): number {
  const text = priceTextBlob(price)
  const match = text.match(FEEDINGS_PER_DAY_PATTERN)
  if (match) {
    const n = parseInt(match[1], 10)
    if (!Number.isNaN(n) && n >= 1) return n
  }
  if (text.includes('fütterung') || text.includes('fuetterung')) {
    return 1
  }
  return 1
}

export function inferExtraQuantityBehavior(price: BookingExtraPrice): ExtraQuantityBehavior {
  if (price.price_type === 'percentage' || price.price_type === 'text') {
    return 'fixedOne'
  }

  const text = priceTextBlob(price)

  const manualKeywords = [
    'einmalig',
    'pauschal',
    'pro km',
    'pro besuch',
    'je gabe',
    'holen',
    'bringen',
    'abhol',
    'termin',
    'schlüssel',
    'schluessel',
    'fahrt',
    'fahrtkosten',
  ]

  const isFeeding =
    text.includes('fütterung') ||
    text.includes('fuetterung') ||
    text.includes('je fütterung')

  if (isFeeding && !containsAny(text, ['pauschal', 'einmalig'])) {
    return 'syncPeriodFeedings'
  }

  if (containsAny(text, manualKeywords)) {
    return 'manual'
  }

  const periodKeywords = [
    'kalendertag',
    'je tag',
    'pro tag',
    'angefangenem tag',
    'je nacht',
    'übernachtung',
    'uebernachtung',
  ]

  if (containsAny(text, periodKeywords)) {
    return 'syncPeriod'
  }

  if (price.price_type === 'fixed') {
    if (containsAny(text, ['pauschal', 'einmalig'])) {
      return 'fixedOne'
    }
    return 'manual'
  }

  if (price.price_type === 'per_unit') {
    return 'manual'
  }

  return 'manual'
}

export function countBookingDaysForPet(
  line: PetLineForExtraQuantity,
  dateRange: DateRange | undefined,
  dayCareOnceDates: Record<string, Date[]>
): number | null {
  if (line.service_type === 'katzenbetreuung') {
    return null
  }

  if (line.service_type === 'tagesbetreuung' && line.day_care_mode === 'recurring') {
    return null
  }

  if (line.service_type === 'tagesbetreuung' && line.day_care_mode === 'once') {
    const count = (dayCareOnceDates[line.pet_id] || []).length
    return count > 0 ? count : null
  }

  if (line.service_type === 'hundepension' && dateRange?.from) {
    const start = toIsoDate(dateRange.from)
    const end = toIsoDate(dateRange.to ?? dateRange.from)
    const days = iterateIsoDateRange(start, end).length
    return days > 0 ? days : null
  }

  return null
}

export function suggestedExtraQuantity(
  price: BookingExtraPrice,
  behavior: ExtraQuantityBehavior,
  dayCount: number | null
): number {
  if (behavior === 'fixedOne' || behavior === 'manual') {
    return 1
  }

  if (dayCount == null || dayCount < 1) {
    return 1
  }

  if (behavior === 'syncPeriodFeedings') {
    return Math.max(1, dayCount * parseFeedingsPerDay(price))
  }

  if (behavior === 'syncPeriod') {
    return Math.max(1, dayCount)
  }

  return 1
}

export function extraQuantityOverrideKey(petId: string, priceId: string): string {
  return `${petId}:${priceId}`
}

export function shouldShowExtraQuantityField(price: BookingExtraPrice): boolean {
  return price.price_type !== 'percentage' && price.price_type !== 'text'
}

export function resolvesExtraQuantityFromPeriod(behavior: ExtraQuantityBehavior): boolean {
  return behavior === 'syncPeriod' || behavior === 'syncPeriodFeedings'
}

export function formatExtraQuantityHint(
  price: BookingExtraPrice,
  behavior: ExtraQuantityBehavior,
  dayCount: number | null,
  quantity: number
): string | null {
  if (behavior === 'syncPeriodFeedings' && dayCount != null && dayCount > 0) {
    const perDay = parseFeedingsPerDay(price)
    const perDayLabel =
      perDay === 1 ? '1 Fütterung pro Tag' : `${perDay} Fütterungen pro Tag`
    return `Vorschlag: ${perDayLabel} × ${dayCount} Tage = ${quantity} – du kannst die Menge anpassen.`
  }

  if (behavior === 'syncPeriod' && dayCount != null && dayCount > 0) {
    return `Vorschlag: ${dayCount} Tage – du kannst die Menge anpassen.`
  }

  if (behavior === 'manual' || behavior === 'fixedOne') {
    return null
  }

  return null
}

export function computeSuggestedExtraForPetLine(
  line: PetLineForExtraQuantity,
  price: BookingExtraPrice,
  dateRange: DateRange | undefined,
  dayCareOnceDates: Record<string, Date[]>
): { behavior: ExtraQuantityBehavior; dayCount: number | null; quantity: number } {
  const behavior = inferExtraQuantityBehavior(price)
  const dayCount = countBookingDaysForPet(line, dateRange, dayCareOnceDates)
  const quantity = suggestedExtraQuantity(price, behavior, dayCount)
  return { behavior, dayCount, quantity }
}
