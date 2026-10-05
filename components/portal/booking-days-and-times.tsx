'use client'

import { Plus } from 'lucide-react'
import { type DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  BookingCalendarLegend,
  BookingRangeCalendar,
} from '@/components/portal/booking-range-calendar'
import { BookingMultiDayCalendar } from '@/components/portal/booking-multi-day-calendar'
import { DayCareRepeatSection } from '@/components/portal/day-care-repeat-section'
import { PickupTimeChips } from '@/components/portal/pickup-time-chips'
import { PickupTimesReference } from '@/components/portal/pickup-times-reference'
import type { KundenportalPickupRow } from '@/lib/cms/portal-defaults'
import { formatSelectedDatesDE } from '@/lib/day-care-booking'
import { formatDateRangeDE } from '@/lib/format-date-range-de'
import type { DayCareScheduleUI } from '@/lib/portal-day-care-schedule'
import type { Pet, ServiceType } from '@/lib/types'
import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'
import { cn } from '@/lib/utils'
import { startOfDay, toIsoDate } from '@/lib/vacation-dates'
import type { PortalBookingStep2DateBlockUI } from '@/lib/portal-booking-step2-validation'

export type PetServiceLineUI = {
  pet_id: string
  service_type: ServiceType | ''
}

export function BookingDaysAndTimes({
  pets,
  resolvedPetLines,
  rangePetLines,
  dayCareLines,
  dateBlocks,
  dayCareOnceDates,
  dayCareScheduleByPet,
  skippedPreviewByPet,
  showRangeBlocksUi,
  needsPickupTimes,
  hundepensionRange,
  dropOffTime,
  pickUpTime,
  onDropOffChange,
  onPickUpChange,
  pickupTimesNote,
  pickupTimesList,
  catalogPrices,
  priceCategories,
  availability,
  calendarDefaultMonth,
  calendarMonth,
  onMonthChange,
  horizonEnd,
  isDateUnavailable,
  highlightedSectionId,
  onBlockRangeSelect,
  onAddDateBlock,
  onRemoveDateBlock,
  onDayCareDatesSelect,
  onDayCareScheduleChange,
}: {
  pets: Pet[]
  resolvedPetLines: PetServiceLineUI[]
  rangePetLines: PetServiceLineUI[]
  dayCareLines: PetServiceLineUI[]
  dateBlocks: PortalBookingStep2DateBlockUI[]
  dayCareOnceDates: Record<string, Date[]>
  dayCareScheduleByPet: Record<string, DayCareScheduleUI>
  skippedPreviewByPet: Record<string, number>
  showRangeBlocksUi: boolean
  needsPickupTimes: boolean
  hundepensionRange: boolean
  dropOffTime: string
  pickUpTime: string
  onDropOffChange: (value: string) => void
  onPickUpChange: (value: string) => void
  pickupTimesNote?: string
  pickupTimesList?: KundenportalPickupRow[]
  catalogPrices?: BookingExtraPrice[]
  priceCategories?: BookingExtraCategory[]
  availability: {
    vacationPeriods: Array<{ start_date: string; end_date: string; label?: string }>
    closedDates: string[]
    publicHolidays: Array<{ date: string; name?: string }>
  }
  calendarDefaultMonth: Date
  calendarMonth: Date
  onMonthChange: (month: Date) => void
  horizonEnd: Date
  isDateUnavailable: (date: Date) => boolean
  highlightedSectionId: string | null
  onBlockRangeSelect: (blockIndex: number, range: DateRange | undefined) => void
  onAddDateBlock: () => void
  onRemoveDateBlock: (index: number) => void
  onDayCareDatesSelect: (petId: string, dates: Date[] | undefined) => void
  onDayCareScheduleChange: (petId: string, patch: Partial<DayCareScheduleUI>) => void
}) {
  const calendarProps = {
    disabled: isDateUnavailable,
    vacationPeriods: availability.vacationPeriods,
    closedDates: availability.closedDates,
    publicHolidays: availability.publicHolidays,
    defaultMonth: calendarDefaultMonth,
    month: calendarMonth,
    onMonthChange,
    horizonEnd,
  }

  return (
    <div className="space-y-6">
      {showRangeBlocksUi && (
        <div className="space-y-3">
          <Label>Zeitraum (Urlaubs- / Katzenbetreuung)</Label>
          <p className="text-sm text-sage-600">
            Ein oder mehrere zusammenhängende Zeiträume – pro Block Bringen am ersten und Abholen am
            letzten Tag.
          </p>
          <div
            className={
              rangePetLines.length > 0 && needsPickupTimes
                ? 'grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,22rem)]'
                : undefined
            }
          >
            <div className="min-w-0 space-y-4">
              {dateBlocks.map((block, blockIndex) => {
                const blockRange: DateRange | undefined =
                  block.from != null ? { from: block.from, to: block.to } : undefined
                return (
                  <div
                    key={blockIndex}
                    className="space-y-3 rounded-lg border border-sage-200/80 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-sage-800">
                        Block {blockIndex + 1}
                      </span>
                      {dateBlocks.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveDateBlock(blockIndex)}
                        >
                          Entfernen
                        </Button>
                      )}
                    </div>
                    <div className="relative isolate overflow-hidden rounded-xl border border-sage-200/80 bg-sage-50/50 p-3">
                      <div className="flex justify-center">
                        <BookingRangeCalendar
                          selected={blockRange}
                          onSelect={(range) => onBlockRangeSelect(blockIndex, range)}
                          {...calendarProps}
                        />
                      </div>
                    </div>
                    {block.from && (
                      <p className="text-center text-sm text-sage-700 lg:text-left">
                        {formatDateRangeDE(block.from, block.to ?? block.from)}
                      </p>
                    )}
                  </div>
                )
              })}
              <Button type="button" variant="outline" size="sm" onClick={onAddDateBlock}>
                <Plus className="mr-1 size-4" />
                Weiteren Block hinzufügen
              </Button>
            </div>
            {rangePetLines.length > 0 && needsPickupTimes && (
              <div className="w-full shrink-0 space-y-4 rounded-lg border border-sage-200 bg-white p-4 lg:sticky lg:top-4">
                <p className="text-sm text-sage-600">
                  Wann möchtest du deinen Hund bringen und wieder abholen?
                </p>
                <PickupTimesReference rows={pickupTimesList} className="text-sm" />
                <PickupTimeChips
                  label="Bringen (am ersten Tag)"
                  value={dropOffTime}
                  onChange={onDropOffChange}
                  prices={catalogPrices}
                  categories={priceCategories}
                />
                <PickupTimeChips
                  label="Abholen (am letzten Tag)"
                  value={pickUpTime}
                  onChange={onPickUpChange}
                  showOvernightHint={hundepensionRange}
                  prices={catalogPrices}
                  categories={priceCategories}
                />
                {pickupTimesNote?.trim() && (
                  <p className="text-sm text-sage-600">{pickupTimesNote.trim()}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {dayCareLines.map((line) => {
        const pet = pets.find((p) => p.id === line.pet_id)
        const sectionId = `daycare-${line.pet_id}`
        const schedule = dayCareScheduleByPet[line.pet_id] ?? {
          repeat: 'none' as const,
          unbefristet: true,
        }
        const dates = dayCareOnceDates[line.pet_id] || []

        return (
          <div
            key={line.pet_id}
            id={sectionId}
            className={cn(
              'space-y-3 rounded-lg transition-shadow',
              highlightedSectionId === sectionId && 'ring-2 ring-destructive'
            )}
          >
            <Label>Tagesbetreuung{pet ? ` – ${pet.name}` : ''}</Label>
            <p className="text-sm text-sage-600">
              Wähle einen oder mehrere Tage im Kalender. Bei Wiederholung dienen die Tage als
              Muster für Wochentage und Start.
            </p>
            <div className="rounded-xl border border-sage-200/80 bg-white p-3">
              <div className="flex w-full justify-center">
                <BookingMultiDayCalendar
                  selected={dates}
                  onSelect={(selected) => onDayCareDatesSelect(line.pet_id, selected || [])}
                  {...calendarProps}
                />
              </div>
            </div>
            {dates.length > 0 && (
              <p className="text-center text-sm text-sage-700">
                {formatSelectedDatesDE(dates.map((d) => toIsoDate(startOfDay(d))))}
              </p>
            )}

            <DayCareRepeatSection
              schedule={schedule}
              onChange={(patch) => onDayCareScheduleChange(line.pet_id, patch)}
              calendarProps={calendarProps}
              skippedCount={skippedPreviewByPet[line.pet_id]}
            />

            {needsPickupTimes && !showRangeBlocksUi && (
              <div className="rounded-lg border border-sage-200 bg-white p-4 space-y-4">
                <PickupTimesReference rows={pickupTimesList} className="text-sm" />
                <PickupTimeChips
                  label="Bringen (Standard pro Betreuungstag)"
                  value={dropOffTime}
                  onChange={onDropOffChange}
                  prices={catalogPrices}
                  categories={priceCategories}
                />
                <PickupTimeChips
                  label="Abholen (Standard pro Betreuungstag)"
                  value={pickUpTime}
                  onChange={onPickUpChange}
                  showOvernightHint
                  prices={catalogPrices}
                  categories={priceCategories}
                />
              </div>
            )}

            <div className="space-y-2 pt-1">
              <p className="text-xs text-sage-600">
                An Betriebsferien und Schließtagen ist keine Betreuung möglich.
              </p>
              <BookingCalendarLegend />
            </div>
          </div>
        )
      })}

      {needsPickupTimes && rangePetLines.length === 0 && dayCareLines.length === 0 && (
        <div className="rounded-lg border border-sage-200 bg-white p-4 space-y-4">
          <PickupTimesReference rows={pickupTimesList} className="text-sm" />
          <PickupTimeChips
            label="Bringen"
            value={dropOffTime}
            onChange={onDropOffChange}
            prices={catalogPrices}
            categories={priceCategories}
          />
          <PickupTimeChips
            label="Abholen"
            value={pickUpTime}
            onChange={onPickUpChange}
            showOvernightHint
            prices={catalogPrices}
            categories={priceCategories}
          />
        </div>
      )}

      {(showRangeBlocksUi || dayCareLines.length > 0) && <BookingCalendarLegend />}
    </div>
  )
}
