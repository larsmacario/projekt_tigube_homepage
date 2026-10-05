'use client'

import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { defaultPickupChipOptions } from '@/lib/pickup-time-chip-options'
import {
  evaluatePickupTimeOnDate,
  isValidTimeHHmm,
  PICKUP_TIME_MIDDAY_NOTE,
} from '@/lib/pickup-time-surcharge'
import {
  needsOvernightOnLastDay,
  OVERNIGHT_PICKUP_NOTE,
  resolveOvernightUnitPrice,
} from '@/lib/overnight-surcharge'
import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'
import { formatEuro } from '@/lib/price-override'

export { defaultPickupChipOptions } from '@/lib/pickup-time-chip-options'

export function PickupTimeChips({
  label,
  value,
  onChange,
  options,
  showOvernightHint,
  prices,
  categories,
  className,
  evaluationIsoDate,
  publicHolidayDates,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options?: string[]
  showOvernightHint?: boolean
  prices?: BookingExtraPrice[]
  categories?: BookingExtraCategory[]
  className?: string
  /** Für Hinweise (Mittagsfenster); z. B. erster Bringtag. */
  evaluationIsoDate?: string
  publicHolidayDates?: Set<string>
}) {
  const [customOpen, setCustomOpen] = useState(false)
  const chips = options ?? defaultPickupChipOptions()
  const holidaySet = publicHolidayDates ?? new Set<string>()

  const overnightFee = useMemo(() => {
    if (!showOvernightHint || !prices?.length || !categories?.length) return null
    if (!needsOvernightOnLastDay(value)) return null
    return resolveOvernightUnitPrice(prices, categories)
  }, [showOvernightHint, value, prices, categories])

  const middayNote = useMemo(() => {
    if (!value || !evaluationIsoDate) return false
    const evaluation = evaluatePickupTimeOnDate(evaluationIsoDate, value, holidaySet)
    return evaluation.middayAppointmentNote
  }, [value, evaluationIsoDate, holidaySet])

  const inChips = value && chips.includes(value)

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((time) => (
          <Button
            key={time}
            type="button"
            size="sm"
            variant={value === time ? 'default' : 'outline'}
            className={value === time ? 'bg-sage-600 hover:bg-sage-700' : ''}
            onClick={() => {
              setCustomOpen(false)
              onChange(time)
            }}
          >
            {time}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={customOpen || (value && !inChips) ? 'default' : 'outline'}
          className={customOpen || (value && !inChips) ? 'bg-sage-600 hover:bg-sage-700' : ''}
          onClick={() => setCustomOpen(true)}
        >
          Andere Zeit (auf Anfrage)
        </Button>
      </div>
      {(customOpen || (value && !inChips)) && (
        <Input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[10rem] bg-white"
        />
      )}
      {middayNote && (
        <p className="text-sm text-sage-700">{PICKUP_TIME_MIDDAY_NOTE}</p>
      )}
      {overnightFee != null && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {OVERNIGHT_PICKUP_NOTE} Geschätzter Zuschlag: {formatEuro(overnightFee)} je Nacht.
        </p>
      )}
      {value && !isValidTimeHHmm(value) && (
        <p className="text-sm text-destructive">Bitte eine gültige Uhrzeit wählen (HH:MM).</p>
      )}
    </div>
  )
}
