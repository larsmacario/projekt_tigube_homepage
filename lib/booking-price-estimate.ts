import { type DateRange } from 'react-day-picker'

import { iterateIsoDateRange } from '@/lib/booking-availability'
import {
  computeLineItemSnapshot,
  filterBookableExtraPrices,
  filterExtraCategoriesForServices,
  type BookingExtraCategory,
  type BookingExtraPrice,
} from '@/lib/booking-extras'
import { formatWeekdayList } from '@/lib/day-care-booking'
import { formatEuro } from '@/lib/price-override'
import type { DayCareMode, Pet, ServiceType } from '@/lib/types'
import { toIsoDate } from '@/lib/vacation-dates'

export const BOOKING_ESTIMATE_DISCLAIMER =
  'Die angezeigten Beträge sind eine unverbindliche Orientierung auf Basis deiner hinterlegten Preise. Sie stellen weder ein Angebot noch einen verbindlichen Preis dar. Endgültiger Leistungsumfang und Rechnungsbetrag legen wir nach Prüfung deiner Anfrage fest – unter anderem je Tarifstufe, Betreuungstagen, Zusatzleistungen pro Tier und individuellen Vereinbarungen. Abweichungen bleiben vorbehalten.'

export const BOOKING_ESTIMATE_COST_NOTICE =
  'Zusatzleistungen gelten jeweils pro Tier. Die Summe kann sich ändern, wenn wir Leistungen anpassen, ergänzen oder streichen.'

export const HUND_GRUNDPREISE_TIER_NOTE =
  'Weitere Tarifstufen findest du unter „Preise“ im Kundenportal.'

export type BookingEstimateLineKind = 'charge' | 'note'

export interface BookingEstimateLine {
  kind: BookingEstimateLineKind
  label: string
  quantity?: number
  unit?: string | null
  unitPrice?: number | null
  lineTotal?: number | null
  detail?: string
}

export interface BookingEstimateResult {
  lines: BookingEstimateLine[]
  total: number | null
  disclaimer: string
}

export interface PetServiceLineInput {
  pet_id: string
  service_type: ServiceType
  day_care_mode?: DayCareMode | ''
}

export interface BookingEstimateInput {
  pets: Pet[]
  petLines: PetServiceLineInput[]
  dateRange?: DateRange
  dayCareOnceDates: Record<string, Date[]>
  dayCareRecurring: Record<string, { weekdays: number[]; startDate?: Date }>
  /** pet_id → price_id → quantity */
  selectedExtrasByPet: Record<string, Record<string, number>>
  prices: BookingExtraPrice[]
  categories: BookingExtraCategory[]
}

function isGrundpreisCategory(category: BookingExtraCategory): boolean {
  return category.name.toLowerCase().includes('grundpreise')
}

function findDefaultHundGrundpreis(
  prices: BookingExtraPrice[],
  categories: BookingExtraCategory[]
): BookingExtraPrice | null {
  const grundCat = categories
    .filter(isGrundpreisCategory)
    .filter((c) => c.service_type === 'hundepension')
    .sort((a, b) => a.sort_order - b.sort_order)[0]

  if (!grundCat) return null

  return (
    prices
      .filter((p) => p.category_id === grundCat.id)
      .filter((p) => p.price_type === 'fixed' || p.price_type === 'per_unit')
      .filter((p) => (p.final_price ?? p.price) != null)
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null
  )
}

function unitPrice(price: BookingExtraPrice): number | null {
  const v = price.final_price ?? price.price
  return v != null && !Number.isNaN(v) ? v : null
}

function addChargeLine(
  lines: BookingEstimateLine[],
  label: string,
  quantity: number,
  unitPriceValue: number,
  unit: string | null
) {
  lines.push({
    kind: 'charge',
    label,
    quantity,
    unit,
    unitPrice: unitPriceValue,
    lineTotal: Math.round(unitPriceValue * quantity * 100) / 100,
  })
}

export function estimateBookingCosts(input: BookingEstimateInput): BookingEstimateResult {
  const lines: BookingEstimateLine[] = []
  const defaultHundPrice = findDefaultHundGrundpreis(input.prices, input.categories)
  const serviceTypes = [...new Set(input.petLines.map((l) => l.service_type))]
  const extraCategories = filterExtraCategoriesForServices(input.categories, serviceTypes)
  const extraCategoryIds = new Set(extraCategories.map((c) => c.id))
  const extraPrices = filterBookableExtraPrices(input.prices, extraCategoryIds)
  const extraById = new Map(extraPrices.map((p) => [p.id, p]))

  for (const line of input.petLines) {
    const pet = input.pets.find((p) => p.id === line.pet_id)
    const petName = pet?.name || 'Tier'

    if (line.service_type === 'katzenbetreuung') {
      lines.push({
        kind: 'note',
        label: `${petName}: Katzenbetreuung`,
        detail:
          'Preis pro Besuch laut deiner Preisliste – genaue Besuche klären wir bei der Bestätigung.',
      })
    } else if (line.service_type === 'hundepension' && input.dateRange?.from) {
      const start = toIsoDate(input.dateRange.from)
      const end = toIsoDate(input.dateRange.to ?? input.dateRange.from)
      const days = iterateIsoDateRange(start, end).length
      if (days > 0 && defaultHundPrice) {
        const up = unitPrice(defaultHundPrice)!
        addChargeLine(
          lines,
          `${petName}: ${defaultHundPrice.name}`,
          days,
          up,
          defaultHundPrice.unit || 'Kalendertag'
        )
        lines.push({
          kind: 'note',
          label: HUND_GRUNDPREISE_TIER_NOTE,
        })
      }
    } else if (line.service_type === 'tagesbetreuung' && line.day_care_mode === 'once') {
      const dates = (input.dayCareOnceDates[line.pet_id] || []).map((d) => toIsoDate(d))
      if (dates.length > 0 && defaultHundPrice) {
        const up = unitPrice(defaultHundPrice)!
        addChargeLine(
          lines,
          `${petName}: Tagesbetreuung (${defaultHundPrice.name})`,
          dates.length,
          up,
          defaultHundPrice.unit || 'Tag'
        )
        lines.push({
          kind: 'note',
          label: HUND_GRUNDPREISE_TIER_NOTE,
        })
      }
    } else if (line.service_type === 'tagesbetreuung' && line.day_care_mode === 'recurring') {
      const cfg = input.dayCareRecurring[line.pet_id]
      const weekdays = cfg?.weekdays ?? []
      if (weekdays.length > 0 && defaultHundPrice) {
        const up = unitPrice(defaultHundPrice)!
        lines.push({
          kind: 'note',
          label: `${petName}: Feste Tage (${formatWeekdayList(weekdays)})`,
          detail: `${formatEuro(up)} pro Tag × ${weekdays.length} Wochentage/Woche – laufend, ohne Enddatum (kein Gesamtbetrag).`,
        })
        lines.push({
          kind: 'note',
          label: HUND_GRUNDPREISE_TIER_NOTE,
        })
      }
    }

    const petExtras = input.selectedExtrasByPet[line.pet_id]
    if (!petExtras) continue

    for (const [priceId, qty] of Object.entries(petExtras)) {
      if (qty <= 0) continue
      const price = extraById.get(priceId)
      if (!price) continue

      if (price.price_type === 'percentage') {
        const pct = price.final_price ?? price.price
        lines.push({
          kind: 'note',
          label: `${petName}: ${price.name}`,
          detail: `+${pct ?? 0}%${price.unit ? ` ${price.unit}` : ''} (Zuschlag auf den Tagespreis)`,
        })
        continue
      }

      const snapshot = computeLineItemSnapshot(price, qty)
      if (snapshot.unit_price == null) continue

      lines.push({
        kind: 'charge',
        label: `${petName}: ${price.name}`,
        quantity: snapshot.quantity,
        unit: price.unit,
        unitPrice: snapshot.unit_price,
        lineTotal: snapshot.line_total,
      })
    }
  }

  const chargeLines = lines.filter((l) => l.kind === 'charge' && l.lineTotal != null)
  const total =
    chargeLines.length > 0
      ? Math.round(chargeLines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0) * 100) / 100
      : null

  return {
    lines,
    total,
    disclaimer: BOOKING_ESTIMATE_DISCLAIMER,
  }
}
