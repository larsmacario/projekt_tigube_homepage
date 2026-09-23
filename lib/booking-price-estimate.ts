import { type DateRange } from 'react-day-picker'

import { iterateIsoDateRange } from '@/lib/booking-availability'
import {
  computeLineItemSnapshot,
  filterApplicableBasePrices,
  filterBookableExtraPrices,
  filterCategoriesForServices,
  serviceTypeForExtraCatalog,
  type BookingExtraCategory,
  type BookingExtraPrice,
} from '@/lib/booking-extras'
import {
  computeSundayHolidaySurchargeTotal,
  countSurchargeDaysInList,
  countSurchargeDaysInRange,
  listWeekendHolidayTravelDates,
  resolveWeekendHolidayTravelUnitPrice,
  WEEKEND_SURCHARGE_FOOTNOTE,
} from '@/lib/booking-sunday-holiday-surcharge'
import {
  countBookingDaysForExtra,
  inferExtraQuantityBehavior,
  resolvesExtraQuantityFromPeriod,
  suggestedExtraQuantity,
  type PetLineForExtraQuantity,
} from '@/lib/booking-extra-quantity'
import { buildPublicHolidayDateSet } from '@/lib/public-holidays-de'
import { resolvePickupDateSpan } from '@/lib/pickup-date-span'
import {
  evaluatePickupTimeOnDate,
  needsOutOfHoursPickupFee,
  PICKUP_TIME_EARLY_ARRIVAL_NOTE,
  PICKUP_TIME_MIDDAY_NOTE,
  resolveOutOfHoursPickupUnitPrice,
} from '@/lib/pickup-time-surcharge'
import {
  findOvernightCatalogPrice,
  needsOvernightOnLastDay,
  OVERNIGHT_PICKUP_NOTE,
  resolveOvernightUnitPrice,
} from '@/lib/overnight-surcharge'
import { FIXED_PERCENTAGE_SURCHARGE_RATE } from '@/lib/price-catalog-policy'
import type { BookingDateBlock } from '@/lib/booking-date-blocks'
import { expandRecurringDayCareDates } from '@/lib/day-care-interval'
import { formatWeekdayList } from '@/lib/day-care-booking'
import { formatEuro } from '@/lib/price-override'
import type { DayCareMode, Pet, ServiceType } from '@/lib/types'
import { toIsoDate } from '@/lib/vacation-dates'

export const BOOKING_ESTIMATE_DISCLAIMER =
  'Die angezeigten Beträge sind eine unverbindliche Orientierung auf Basis deiner hinterlegten Preise. Sie stellen weder ein Angebot noch einen verbindlichen Preis dar. Endgültiger Leistungsumfang und Rechnungsbetrag legen wir nach Prüfung deiner Anfrage fest – unter anderem je Tarifstufe, Betreuungstagen, Zusatzleistungen pro Tier und individuellen Vereinbarungen. Leistungen wie Futter oder Medikamentengabe können wir nach Bedarf nachträglich ergänzen. Abweichungen bleiben vorbehalten.'

export const BOOKING_ESTIMATE_COST_NOTICE =
  'Enthalten sind Grundpreis, Sonn- und Feiertagszuschlag, ggf. von dir gewählte Zusatzleistungen, Bring-/Hol-Zuschläge und ggf. Übernachtung. Leistungen wie Futter, Medikamentengabe oder spezielle Pflege vergeben wir nach Bedarf individuell nachträglich – sie sind in dieser Schätzung nicht enthalten.'

export const BOOKING_ESTIMATE_MANUAL_EXTRAS_NOTICE =
  'Futter, Medikamentengabe und ähnliche Leistungen werden erst nach deiner Anfrage individuell festgelegt und erscheinen daher nicht in der Summe.'

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
  dateBlocks?: BookingDateBlock[]
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
  /** pet_id → price_id → quantity */
  selectedExtrasByPet: Record<string, Record<string, number>>
  prices: BookingExtraPrice[]
  /** Optional je Tier aufgelöste Preise (z. B. Tier-Regeln) */
  pricesByPetId?: Record<string, BookingExtraPrice[]>
  categories: BookingExtraCategory[]
  /** ISO-Daten gesetzlicher Feiertage (BW) im Buchungszeitraum */
  publicHolidays?: Array<{ date: string; name?: string }>
  /** HH:mm – nur Urlaubsbetreuung mit Zeitraum */
  dropOffTime?: string | null
  pickUpTime?: string | null
}

function petPricesForLine(petId: string, input: BookingEstimateInput): BookingExtraPrice[] {
  return input.pricesByPetId?.[petId] ?? input.prices
}

function resolveEstimateDateBlocks(input: BookingEstimateInput): BookingDateBlock[] {
  if (input.dateBlocks?.length) return input.dateBlocks
  if (input.dateRange?.from) {
    return [
      {
        start_date: toIsoDate(input.dateRange.from),
        end_date: toIsoDate(input.dateRange.to ?? input.dateRange.from),
      },
    ]
  }
  return []
}

function countCalendarDaysInBlocks(blocks: BookingDateBlock[]): number {
  return blocks.reduce(
    (sum, block) => sum + iterateIsoDateRange(block.start_date, block.end_date).length,
    0
  )
}

function categoryIdsForService(
  input: BookingEstimateInput,
  serviceType: ServiceType
): Set<string> {
  const categories = filterCategoriesForServices(input.categories, [serviceType])
  return new Set(categories.map((category) => category.id))
}

function findBasePriceForPet(
  petId: string,
  input: BookingEstimateInput,
  serviceType: ServiceType
): BookingExtraPrice | null {
  const categoryIds = categoryIdsForService(input, serviceType)
  return filterApplicableBasePrices(petPricesForLine(petId, input), categoryIds)[0] ?? null
}

function findAutoApplicableExtrasForPet(
  petId: string,
  input: BookingEstimateInput,
  serviceType: ServiceType
): BookingExtraPrice[] {
  const categoryIds = categoryIdsForService(input, serviceType)
  return petPricesForLine(petId, input)
    .filter(
      (price) =>
        categoryIds.has(price.category_id) &&
        price.usage === 'extra' &&
        price.applicable !== false &&
        price.price_type !== 'text' &&
        price.price_type !== 'percentage'
    )
    .sort((a, b) => a.sort_order - b.sort_order)
}

function appendAutoApplicableExtras(
  lines: BookingEstimateLine[],
  petName: string,
  line: PetServiceLineInput,
  input: BookingEstimateInput,
  manuallySelectedIds: Set<string>
) {
  const extras = findAutoApplicableExtrasForPet(line.pet_id, input, line.service_type)
  const overnightCatalog = findOvernightCatalogPrice(input.prices, input.categories)
  const petLine: PetLineForExtraQuantity = {
    pet_id: line.pet_id,
    service_type: line.service_type,
    day_care_mode: line.day_care_mode,
  }

  for (const price of extras) {
    if (manuallySelectedIds.has(price.id)) continue
    if (overnightCatalog?.id === price.id) continue
    const behavior = inferExtraQuantityBehavior(price)
    if (!resolvesExtraQuantityFromPeriod(behavior)) continue

    const dayCount = countBookingDaysForExtra(
      price,
      petLine,
      input.dateRange,
      input.dayCareOnceDates
    )
    const quantity = suggestedExtraQuantity(price, behavior, dayCount)
    const snapshot = computeLineItemSnapshot(price, quantity)
    if (snapshot.unit_price == null || snapshot.line_total == null) continue

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
  const serviceTypes = [...new Set(input.petLines.map((l) => l.service_type))]
  const extraCategories = filterCategoriesForServices(input.categories, serviceTypes)
  const extraCategoryIds = new Set(extraCategories.map((c) => c.id))
  const extraPrices = filterBookableExtraPrices(input.prices, extraCategoryIds)
  const extraById = new Map(extraPrices.map((p) => [p.id, p]))
  const holidaySet = buildPublicHolidayDateSet(
    (input.publicHolidays || []).map((h) => ({ date: h.date, name: h.name || '' }))
  )
  let addedWeekendSurchargeNote = false

  function appendWeekendSurcharge(petName: string, surchargeDays: number, dailyUp: number) {
    if (surchargeDays <= 0) return
    const surchargePerDay = (dailyUp * FIXED_PERCENTAGE_SURCHARGE_RATE) / 100
    const lineTotal = computeSundayHolidaySurchargeTotal(surchargeDays, dailyUp)
    if (lineTotal == null) return
    addChargeLine(
      lines,
      `${petName}: Sonn- und Feiertagszuschlag`,
      surchargeDays,
      surchargePerDay,
      `${FIXED_PERCENTAGE_SURCHARGE_RATE} % vom Tagespreis`
    )
    if (!addedWeekendSurchargeNote) {
      lines.push({
        kind: 'note',
        label: WEEKEND_SURCHARGE_FOOTNOTE,
      })
      addedWeekendSurchargeNote = true
    }
  }

  for (const line of input.petLines) {
    const pet = input.pets.find((p) => p.id === line.pet_id)
    const petName = pet?.name || 'Tier'
    const basePriceForPet =
      line.service_type === 'hundepension' || line.service_type === 'tagesbetreuung'
        ? findBasePriceForPet(
            line.pet_id,
            input,
            line.service_type === 'tagesbetreuung' ? 'tagesbetreuung' : 'hundepension'
          )
        : null

    const rangeBlocks = resolveEstimateDateBlocks(input)

    if (line.service_type === 'katzenbetreuung') {
      if (rangeBlocks.length > 0) {
        const days = countCalendarDaysInBlocks(rangeBlocks)
        lines.push({
          kind: 'note',
          label: `${petName}: Katzenbetreuung`,
          detail: `${days} Kalendertag(e) in ${rangeBlocks.length} Block/Blöcken – Preis pro Besuch laut Preisliste, genaue Besuche klären wir bei der Bestätigung.`,
        })
      } else {
        lines.push({
          kind: 'note',
          label: `${petName}: Katzenbetreuung`,
          detail:
            'Preis pro Besuch laut deiner Preisliste – genaue Besuche klären wir bei der Bestätigung.',
        })
      }
    } else if (line.service_type === 'hundepension' && rangeBlocks.length > 0) {
      const days = countCalendarDaysInBlocks(rangeBlocks)
      if (days > 0 && basePriceForPet) {
        const up = unitPrice(basePriceForPet)!
        addChargeLine(
          lines,
          `${petName}: ${basePriceForPet.name}`,
          days,
          up,
          basePriceForPet.unit || 'Kalendertag'
        )
        if (rangeBlocks.length > 1) {
          lines.push({
            kind: 'note',
            label: `${petName}: ${rangeBlocks.length} Betreuungsblöcke`,
          })
        }
        lines.push({
          kind: 'note',
          label: HUND_GRUNDPREISE_TIER_NOTE,
        })
        const surchargeDays = rangeBlocks.reduce(
          (sum, block) =>
            sum +
            countSurchargeDaysInRange(block.start_date, block.end_date, holidaySet, {
              excludeEndDate: true,
            }),
          0
        )
        appendWeekendSurcharge(petName, surchargeDays, up)
        appendAutoApplicableExtras(
          lines,
          petName,
          line,
          input,
          new Set(Object.keys(input.selectedExtrasByPet[line.pet_id] ?? {}))
        )
      }
    } else if (line.service_type === 'tagesbetreuung' && line.day_care_mode === 'once') {
      const dates = (input.dayCareOnceDates[line.pet_id] || []).map((d) => toIsoDate(d))
      if (dates.length > 0 && basePriceForPet) {
        const up = unitPrice(basePriceForPet)!
        addChargeLine(
          lines,
          `${petName}: Tagesbetreuung (${basePriceForPet.name})`,
          dates.length,
          up,
          basePriceForPet.unit || 'Tag'
        )
        lines.push({
          kind: 'note',
          label: HUND_GRUNDPREISE_TIER_NOTE,
        })
        appendWeekendSurcharge(petName, countSurchargeDaysInList(dates, holidaySet), up)
        appendAutoApplicableExtras(
          lines,
          petName,
          line,
          input,
          new Set(Object.keys(input.selectedExtrasByPet[line.pet_id] ?? {}))
        )
      }
    } else if (line.service_type === 'tagesbetreuung' && line.day_care_mode === 'recurring') {
      const cfg = input.dayCareRecurring[line.pet_id]
      const weekdays = cfg?.weekdays ?? []
      if (weekdays.length > 0 && basePriceForPet) {
        const up = unitPrice(basePriceForPet)!
        const intervalLabel = cfg?.intervalWeeks === 2 ? 'alle 14 Tage' : 'wöchentlich'
        const unbefristet = cfg?.unbefristet !== false && !cfg?.endDate
        if (unbefristet) {
          lines.push({
            kind: 'note',
            label: `${petName}: Feste Tage (${formatWeekdayList(weekdays)}, ${intervalLabel})`,
            detail: `${formatEuro(up)} pro Tag – unbefristet (kein Gesamtbetrag).`,
          })
        } else if (cfg?.startDate && cfg.endDate) {
          const startIso = toIsoDate(cfg.startDate)
          const endIso = toIsoDate(cfg.endDate)
          const dates = expandRecurringDayCareDates(
            startIso,
            endIso,
            weekdays,
            cfg.intervalWeeks ?? 1
          )
          const lineTotal = dates.length * up
          addChargeLine(
            lines,
            `${petName}: Feste Tage (${formatWeekdayList(weekdays)}, ${intervalLabel})`,
            dates.length,
            up,
            basePriceForPet.unit || 'Tag'
          )
          lines.push({
            kind: 'note',
            label: `${petName}: Befristet bis ${endIso}`,
            detail: `Orientierung ca. ${formatEuro(lineTotal)} für ${dates.length} Termin(e).`,
          })
        }
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

  const pickupSpan = resolvePickupDateSpan(input)
  const needsPickupEstimate = input.petLines.some(
    (l) => l.service_type === 'hundepension' || l.service_type === 'tagesbetreuung'
  )
  if (needsPickupEstimate && pickupSpan && input.dropOffTime && input.pickUpTime) {
    const { start, end } = pickupSpan
    const outOfHoursFee = resolveOutOfHoursPickupUnitPrice(input.prices, input.categories)

    const dropEval = evaluatePickupTimeOnDate(start, input.dropOffTime, holidaySet)
    const pickEval = evaluatePickupTimeOnDate(end, input.pickUpTime, holidaySet)

    if (needsOutOfHoursPickupFee(dropEval)) {
      addChargeLine(
        lines,
        'Bringen außerhalb Standardzeit (geschätzt)',
        1,
        outOfHoursFee,
        'pro Termin'
      )
    }
    if (needsOutOfHoursPickupFee(pickEval)) {
      addChargeLine(
        lines,
        'Abholen außerhalb Standardzeit (geschätzt)',
        1,
        outOfHoursFee,
        'pro Termin'
      )
    }

    const notes = new Set<string>()
    if (dropEval.middayAppointmentNote || pickEval.middayAppointmentNote) {
      notes.add(PICKUP_TIME_MIDDAY_NOTE)
    }
    if (dropEval.earlyArrivalNote || pickEval.earlyArrivalNote) {
      notes.add(PICKUP_TIME_EARLY_ARRIVAL_NOTE)
    }
    for (const note of notes) {
      lines.push({ kind: 'note', label: note })
    }

    if (needsOvernightOnLastDay(input.pickUpTime)) {
      const overnightFee = resolveOvernightUnitPrice(input.prices, input.categories)
      addChargeLine(lines, 'Übernachtung (geschätzt)', 1, overnightFee, 'je Nacht')
      lines.push({ kind: 'note', label: OVERNIGHT_PICKUP_NOTE })
    }

    const travelUnitPrice = resolveWeekendHolidayTravelUnitPrice(input.prices, input.categories)
    const travelDates = listWeekendHolidayTravelDates(start, end, holidaySet)
    for (const travelDate of travelDates) {
      const travelLabel =
        travelDates.length === 1
          ? 'An- und Abreise an Sonn-/Feiertagen (geschätzt)'
          : travelDate === start
            ? 'An- und Abreise an Sonn-/Feiertagen – Bringen (geschätzt)'
            : 'An- und Abreise an Sonn-/Feiertagen – Abholen (geschätzt)'
      addChargeLine(lines, travelLabel, 1, travelUnitPrice, 'pauschal')
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
