'use client'

import { useMemo } from 'react'
import { type DateRange } from 'react-day-picker'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'
import {
  BOOKING_ESTIMATE_COST_NOTICE,
  estimateBookingCosts,
  type BookingEstimateLine,
} from '@/lib/booking-price-estimate'
import type { PetExtraSelections } from '@/lib/booking-extras'
import {
  dayCareModeLabel,
  formatDayCareBookingSummary,
  formatSelectedDatesDE,
} from '@/lib/day-care-booking'
import { formatDateRangeDE } from '@/lib/format-date-range-de'
import { formatEuro } from '@/lib/price-override'
import type { DayCareMode, Pet, ServiceType } from '@/lib/types'
import { startOfDay, toIsoDate } from '@/lib/vacation-dates'

import type { PetServiceLine } from '@/components/portal/portal-booking-wizard'

function getServiceLabel(serviceType: string) {
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

function formatEstimateLine(line: BookingEstimateLine): string {
  if (line.kind === 'note') {
    return line.detail ? `${line.label} – ${line.detail}` : line.label
  }
  const qty = line.quantity ?? 1
  const unit = line.unit ? ` ${line.unit}` : ''
  const up = line.unitPrice != null ? formatEuro(line.unitPrice) : '—'
  const total = line.lineTotal != null ? formatEuro(line.lineTotal) : '—'
  return `${line.label}: ${qty}× ${up}${unit} = ${total}`
}

export interface PortalBookingWizardOverviewProps {
  pets: Pet[]
  resolvedPetLines: PetServiceLine[]
  rangePetLines: PetServiceLine[]
  dayCareOnceLines: PetServiceLine[]
  dayCareRecurringLines: PetServiceLine[]
  dateRange?: DateRange
  dayCareOnceDates: Record<string, Date[]>
  dayCareRecurring: Record<string, { weekdays: number[]; startDate?: Date }>
  selectedExtrasByPet: PetExtraSelections
  catalogPrices: BookingExtraPrice[]
  priceCategories: BookingExtraCategory[]
  message: string
  onMessageChange: (value: string) => void
  pricesLoading?: boolean
}

export function PortalBookingWizardOverview({
  pets,
  resolvedPetLines,
  rangePetLines,
  dayCareOnceLines,
  dayCareRecurringLines,
  dateRange,
  dayCareOnceDates,
  dayCareRecurring,
  selectedExtrasByPet,
  catalogPrices,
  priceCategories,
  message,
  onMessageChange,
  pricesLoading,
}: PortalBookingWizardOverviewProps) {
  const estimate = useMemo(
    () =>
      estimateBookingCosts({
        pets,
        petLines: resolvedPetLines.map((l) => ({
          pet_id: l.pet_id,
          service_type: l.service_type as ServiceType,
          day_care_mode: l.day_care_mode,
        })),
        dateRange,
        dayCareOnceDates,
        dayCareRecurring,
        selectedExtrasByPet,
        prices: catalogPrices,
        categories: priceCategories,
      }),
    [
      pets,
      resolvedPetLines,
      dateRange,
      dayCareOnceDates,
      dayCareRecurring,
      selectedExtrasByPet,
      catalogPrices,
      priceCategories,
    ]
  )

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-sage-200 bg-sage-50/60 p-3 text-sm text-sage-800">
        <p className="font-medium">Deine Anfrage</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {resolvedPetLines.map((line) => {
            const pet = pets.find((p) => p.id === line.pet_id)
            let detail = getServiceLabel(line.service_type)
            if (line.service_type === 'tagesbetreuung' && line.day_care_mode) {
              detail += ` (${dayCareModeLabel(line.day_care_mode as DayCareMode)})`
            }
            return (
              <li key={line.pet_id}>
                {pet?.name}: {detail}
              </li>
            )
          })}
        </ul>
        {rangePetLines.length > 0 && dateRange?.from && (
          <p className="mt-2">
            Zeitraum: {formatDateRangeDE(dateRange.from, dateRange.to ?? dateRange.from)}
          </p>
        )}
        {dayCareOnceLines.map((line) => {
          const dates = (dayCareOnceDates[line.pet_id] || []).map((d) =>
            toIsoDate(startOfDay(d))
          )
          if (dates.length === 0) return null
          const pet = pets.find((p) => p.id === line.pet_id)
          return (
            <p key={line.pet_id} className="mt-2">
              {pet?.name}: {formatSelectedDatesDE(dates)}
            </p>
          )
        })}
        {dayCareRecurringLines.map((line) => {
          const cfg = dayCareRecurring[line.pet_id]
          if (!cfg?.startDate || !cfg.weekdays.length) return null
          const summary = formatDayCareBookingSummary({
            service_type: 'tagesbetreuung',
            day_care_mode: 'recurring',
            day_care_weekdays: cfg.weekdays,
            selected_dates: null,
            start_date: toIsoDate(startOfDay(cfg.startDate)),
            end_date: null,
          })
          const pet = pets.find((p) => p.id === line.pet_id)
          return (
            <p key={line.pet_id} className="mt-2">
              {pet?.name}: {summary}
            </p>
          )
        })}
      </div>

      <div>
        <p className="font-medium text-sage-900">Kostenschätzung</p>
        <p className="mt-1 text-sm text-sage-600">{BOOKING_ESTIMATE_COST_NOTICE}</p>
        {pricesLoading ? (
          <p className="mt-2 text-sm text-sage-600">Preise werden geladen…</p>
        ) : estimate.lines.length === 0 ? (
          <p className="mt-2 text-sm text-sage-600">
            Für diese Auswahl können wir noch keine Positionen berechnen.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-sage-800">
            {estimate.lines.map((line, i) => (
              <li
                key={`${line.label}-${i}`}
                className={
                  line.kind === 'note'
                    ? 'text-sage-600 italic'
                    : 'flex flex-wrap justify-between gap-2 border-b border-sage-100 pb-2 last:border-0'
                }
              >
                {line.kind === 'charge' ? (
                  <>
                    <span>{line.label}</span>
                    <span className="font-medium tabular-nums">
                      {line.lineTotal != null ? formatEuro(line.lineTotal) : '—'}
                    </span>
                  </>
                ) : (
                  formatEstimateLine(line)
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-baseline justify-between border-t border-sage-200 pt-3">
          <span className="font-medium text-sage-900">Geschätzte Summe</span>
          <span className="text-lg font-semibold tabular-nums text-sage-900">
            {estimate.total != null ? formatEuro(estimate.total) : '—'}
          </span>
        </div>
        <div
          className="mt-3 rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-950"
          role="note"
        >
          {estimate.disclaimer}
        </div>
      </div>

      <div>
        <Label htmlFor="booking-message">Nachricht (optional)</Label>
        <Textarea
          id="booking-message"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Zusätzliche Informationen..."
          rows={3}
        />
      </div>
    </div>
  )
}
