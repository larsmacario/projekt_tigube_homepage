'use client'

import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { isValidTimeHHmm } from '@/lib/pickup-time-surcharge'
import {
  needsOvernightOnLastDay,
  OVERNIGHT_PICKUP_NOTE,
  resolveOvernightUnitPrice,
} from '@/lib/overnight-surcharge'
import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'
import { formatEuro } from '@/lib/price-override'

const STEP_MINUTES = 30

function buildTimeOptions(startHour: number, endHour: number): string[] {
  const options: string[] = []
  for (let h = startHour; h <= endHour; h++) {
    for (const m of [0, 30]) {
      if (h === endHour && m > 0) break
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return options
}

export function defaultPickupChipOptions(): string[] {
  return buildTimeOptions(6, 21)
}

export function PickupTimeChips({
  label,
  value,
  onChange,
  options,
  showOvernightHint,
  prices,
  categories,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options?: string[]
  showOvernightHint?: boolean
  prices?: BookingExtraPrice[]
  categories?: BookingExtraCategory[]
  className?: string
}) {
  const [customOpen, setCustomOpen] = useState(false)
  const chips = options ?? defaultPickupChipOptions()

  const overnightFee = useMemo(() => {
    if (!showOvernightHint || !prices?.length || !categories?.length) return null
    if (!needsOvernightOnLastDay(value)) return null
    return resolveOvernightUnitPrice(prices, categories)
  }, [showOvernightHint, value, prices, categories])

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
          Andere Uhrzeit
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
