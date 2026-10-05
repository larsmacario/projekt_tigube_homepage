'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PickupTimeChips } from '@/components/portal/pickup-time-chips'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { resolveDefaultTimesFromContext } from '@/lib/booking-modification-appointment'
import { getActiveBookingDates } from '@/lib/cancellation-booking-total'
import { getBookingHorizonEndIso } from '@/lib/booking-horizon'
import { DAY_CARE_WEEKDAY_OPTIONS, dayCareIntervalLabel } from '@/lib/day-care-booking'
import { formatEuro } from '@/lib/price-override'
import { readApiResponse } from '@/lib/read-api-response'
import { sortIsoDates } from '@/lib/day-care-booking'
import type { BookingAppointmentPlan } from '@/lib/booking-appointment-plan'
import type { BookingRequest } from '@/lib/types'

type ModificationPreview = {
  diff: {
    removed: string[]
    added: string[]
    unchanged: boolean
  }
  availability: { valid: boolean; error?: string }
  cancellationPreview?: {
    cancellationChargeAmount: number
    cancellationRefundAmount: number
    tierLabel: string
    waivedFees?: boolean
  } | null
  estimatedAddedTotal: number
  timesChanged?: boolean
  scheduleChanged?: boolean
}

type ModificationContext = {
  drop_off_time: string | null
  pick_up_time: string | null
  appointment_plan: BookingAppointmentPlan | null
}

type Props = {
  booking: BookingRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'portal' | 'admin'
  onUpdated: (booking: BookingRequest) => void
}

function apiBase(mode: 'portal' | 'admin', bookingId: string) {
  return mode === 'admin'
    ? `/api/admin/bookings/${bookingId}/modification`
    : `/api/portal/bookings/${bookingId}/modification`
}

export function BookingModificationDialog({
  booking,
  open,
  onOpenChange,
  mode,
  onUpdated,
}: Props) {
  const { toast } = useToast()
  const horizonEnd = useMemo(() => getBookingHorizonEndIso(), [])

  const isOnceDayCare =
    booking?.service_type === 'tagesbetreuung' && booking.day_care_mode === 'once'
  const isRecurring =
    booking?.service_type === 'tagesbetreuung' && booking.day_care_mode === 'recurring'
  const isRange =
    !isOnceDayCare &&
    !isRecurring &&
    (booking?.service_type === 'hundepension' ||
      booking?.service_type === 'katzenbetreuung' ||
      booking?.service_type === 'tagesbetreuung')

  const showPickupTimes =
    booking?.service_type === 'hundepension' ||
    booking?.service_type === 'katzenbetreuung' ||
    booking?.service_type === 'tagesbetreuung'

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [newDateInput, setNewDateInput] = useState('')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [intervalWeeks, setIntervalWeeks] = useState<1 | 2>(1)
  const [dropOffTime, setDropOffTime] = useState('')
  const [pickUpTime, setPickUpTime] = useState('')
  const [timesInitialized, setTimesInitialized] = useState(false)
  const [waiveCancellation, setWaiveCancellation] = useState(false)
  const [preview, setPreview] = useState<ModificationPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !booking) {
      setPreview(null)
      setTimesInitialized(false)
      return
    }
    setWaiveCancellation(false)
    if (isOnceDayCare) {
      setSelectedDates(sortIsoDates(getActiveBookingDates(booking)))
      setStartDate('')
      setEndDate('')
    } else {
      setStartDate(booking.start_date)
      setEndDate(booking.end_date ?? booking.start_date)
      setSelectedDates([])
    }
    if (isRecurring) {
      setWeekdays([...(booking.day_care_weekdays ?? [])].sort((a, b) => a - b))
      setIntervalWeeks(booking.day_care_interval_weeks === 2 ? 2 : 1)
    } else {
      setWeekdays([])
      setIntervalWeeks(1)
    }
    setDropOffTime('')
    setPickUpTime('')
    setTimesInitialized(false)

    void (async () => {
      try {
        const response = await authenticatedFetch(
          `${apiBase(mode, booking.id)}?context=1`
        )
        const { data, error } = await readApiResponse<{ context?: ModificationContext | null }>(
          response
        )
        if (error) return
        const defaults = resolveDefaultTimesFromContext(data?.context ?? null)
        setDropOffTime(defaults.drop_off)
        setPickUpTime(defaults.pick_up)
        setTimesInitialized(true)
      } catch {
        setDropOffTime('07:00')
        setPickUpTime('17:00')
        setTimesInitialized(true)
      }
    })()
  }, [open, booking, isOnceDayCare, isRecurring, mode])

  const buildQuery = useCallback(() => {
    if (!booking) return ''
    const params = new URLSearchParams()
    if (isOnceDayCare) {
      if (selectedDates.length === 0) return ''
      params.set('selected_dates', selectedDates.join(','))
    } else {
      if (!startDate) return ''
      params.set('start_date', startDate)
      params.set('end_date', endDate || startDate)
    }
    if (isRecurring && weekdays.length > 0) {
      params.set('day_care_weekdays', weekdays.join(','))
      params.set('day_care_interval_weeks', String(intervalWeeks))
    }
    if (showPickupTimes && timesInitialized && dropOffTime) {
      params.set('drop_off_time', dropOffTime)
    }
    if (showPickupTimes && timesInitialized && pickUpTime) {
      params.set('pick_up_time', pickUpTime)
    }
    if (mode === 'admin' && waiveCancellation) {
      params.set('waive_cancellation', '1')
    }
    return params.toString()
  }, [
    booking,
    isOnceDayCare,
    isRecurring,
    selectedDates,
    startDate,
    endDate,
    weekdays,
    intervalWeeks,
    showPickupTimes,
    timesInitialized,
    dropOffTime,
    pickUpTime,
    mode,
    waiveCancellation,
  ])

  useEffect(() => {
    if (!open || !booking || !timesInitialized) return
    const query = buildQuery()
    if (!query) {
      setPreview(null)
      return
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        setLoadingPreview(true)
        try {
          const response = await authenticatedFetch(
            `${apiBase(mode, booking.id)}?${query}`
          )
          const { data, error } = await readApiResponse<{ preview?: ModificationPreview }>(
            response
          )
          if (error) throw new Error(error)
          setPreview(data?.preview ?? null)
        } catch (error) {
          setPreview(null)
          toast({
            title: 'Vorschau fehlgeschlagen',
            description: error instanceof Error ? error.message : 'Unbekannter Fehler',
            variant: 'destructive',
          })
        } finally {
          setLoadingPreview(false)
        }
      })()
    }, 400)

    return () => window.clearTimeout(handle)
  }, [open, booking, buildQuery, mode, toast, timesInitialized])

  function toggleSelectedDate(date: string, checked: boolean) {
    setSelectedDates((current) => {
      const next = checked ? [...current, date] : current.filter((d) => d !== date)
      return sortIsoDates(next)
    })
  }

  function toggleWeekday(iso: number) {
    setWeekdays((current) => {
      const next = current.includes(iso)
        ? current.filter((d) => d !== iso)
        : [...current, iso]
      return [...next].sort((a, b) => a - b)
    })
  }

  function addSelectedDate() {
    if (!newDateInput) return
    if (newDateInput > horizonEnd) {
      toast({
        title: 'Datum außerhalb des Horizonts',
        variant: 'destructive',
      })
      return
    }
    setSelectedDates((current) => sortIsoDates([...new Set([...current, newDateInput])]))
    setNewDateInput('')
  }

  async function handleConfirm() {
    if (!booking) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = isOnceDayCare
        ? { selected_dates: selectedDates }
        : { start_date: startDate, end_date: endDate || startDate }
      if (isRecurring && weekdays.length > 0) {
        body.day_care_weekdays = weekdays
        body.day_care_interval_weeks = intervalWeeks
      }
      if (showPickupTimes && dropOffTime) body.drop_off_time = dropOffTime
      if (showPickupTimes && pickUpTime) body.pick_up_time = pickUpTime
      if (mode === 'admin') {
        body.waiveCancellation = waiveCancellation
      }

      const response = await authenticatedFetch(apiBase(mode, booking.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const { data, error } = await readApiResponse<{ booking?: BookingRequest }>(response)
      if (error) throw new Error(error)
      if (!data?.booking) throw new Error('Anpassung konnte nicht gespeichert werden.')

      toast({ title: 'Buchung angepasst' })
      onUpdated(data.booking)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Anpassung fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!booking) return null

  const hasChanges =
    preview &&
    (!preview.diff.unchanged || preview.timesChanged || preview.scheduleChanged)

  const canSubmit =
    hasChanges &&
    preview.availability.valid &&
    !loadingPreview &&
    timesInitialized &&
    (isOnceDayCare ? selectedDates.length > 0 : Boolean(startDate)) &&
    (!isRecurring || weekdays.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buchung anpassen</DialogTitle>
          <DialogDescription>
            {booking.pet?.name || 'Tier'} · Zeitraum, Rhythmus und Zeiten
          </DialogDescription>
        </DialogHeader>

        {isOnceDayCare ? (
          <div className="space-y-3">
            <p className="text-sm text-sage-600">
              Tage hinzufügen oder entfernen. Entfernte Tage können Stornogebühren auslösen.
            </p>
            <div className="flex gap-2">
              <Input
                type="date"
                max={horizonEnd}
                value={newDateInput}
                onChange={(e) => setNewDateInput(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={addSelectedDate}>
                Tag hinzufügen
              </Button>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-sage-200 p-3">
              {selectedDates.map((date) => (
                <label key={date} className="flex items-center gap-2 text-sm text-sage-800">
                  <Checkbox
                    checked
                    onCheckedChange={(checked) => toggleSelectedDate(date, checked === true)}
                  />
                  {new Date(date + 'T12:00:00').toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </label>
              ))}
              {selectedDates.length === 0 && (
                <p className="text-sm text-sage-600">Mindestens ein Tag erforderlich.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mod-start">Von</Label>
                <Input
                  id="mod-start"
                  type="date"
                  max={horizonEnd}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="mod-end">Bis</Label>
                <Input
                  id="mod-end"
                  type="date"
                  min={startDate || undefined}
                  max={horizonEnd}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {isRecurring && (
              <div className="space-y-3 rounded-lg border border-sage-200/80 bg-sage-50/40 p-3">
                <Label className="text-sm">Betreuungsrhythmus</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={intervalWeeks === 1 ? 'default' : 'outline'}
                    className={intervalWeeks === 1 ? 'bg-sage-600 hover:bg-sage-700' : ''}
                    onClick={() => setIntervalWeeks(1)}
                  >
                    Wöchentlich
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={intervalWeeks === 2 ? 'default' : 'outline'}
                    className={intervalWeeks === 2 ? 'bg-sage-600 hover:bg-sage-700' : ''}
                    onClick={() => setIntervalWeeks(2)}
                  >
                    Alle 14 Tage
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAY_CARE_WEEKDAY_OPTIONS.map((day) => {
                    const active = weekdays.includes(day.iso)
                    return (
                      <Button
                        key={day.iso}
                        type="button"
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        className={active ? 'bg-sage-600 hover:bg-sage-700' : ''}
                        onClick={() => toggleWeekday(day.iso)}
                      >
                        {day.label}
                      </Button>
                    )
                  })}
                </div>
                <p className="text-xs text-sage-600">
                  Aktuell: {dayCareIntervalLabel(intervalWeeks)}
                  {weekdays.length > 0 &&
                    ` · ${DAY_CARE_WEEKDAY_OPTIONS.filter((d) => weekdays.includes(d.iso))
                      .map((d) => d.label)
                      .join(', ')}`}
                </p>
              </div>
            )}
          </div>
        )}

        {showPickupTimes && timesInitialized && (
          <div className="space-y-3 rounded-lg border border-sage-200/80 p-3">
            <p className="text-sm font-medium text-sage-900">Standardzeiten</p>
            <PickupTimeChips
              label="Bringen"
              value={dropOffTime}
              onChange={setDropOffTime}
              evaluationIsoDate={startDate || booking.start_date}
            />
            <PickupTimeChips
              label="Abholen"
              value={pickUpTime}
              onChange={setPickUpTime}
              evaluationIsoDate={startDate || booking.start_date}
              showOvernightHint={isRange}
            />
          </div>
        )}

        {mode === 'admin' && booking.status === 'approved' && (
          <label className="flex items-center gap-2 text-sm text-sage-800">
            <Checkbox
              checked={waiveCancellation}
              onCheckedChange={(checked) => setWaiveCancellation(checked === true)}
            />
            Ohne Stornogebühr (nur Admin)
          </label>
        )}

        {hasChanges && (
          <div className="space-y-2 rounded-lg border border-sage-200 bg-sage-50 p-3 text-sm text-sage-800">
            {preview.scheduleChanged && (
              <p>Rhythmus wird angepasst ({dayCareIntervalLabel(intervalWeeks)}).</p>
            )}
            {preview.timesChanged && <p>Bring- und/oder Holzeiten werden angepasst.</p>}
            {preview.diff.added.length > 0 && (
              <p>
                Neue Tage: {preview.diff.added.length}
                {preview.estimatedAddedTotal > 0 &&
                  ` · ca. ${formatEuro(preview.estimatedAddedTotal)}`}
              </p>
            )}
            {preview.diff.removed.length > 0 && (
              <p>Entfallende Tage: {preview.diff.removed.length}</p>
            )}
            {!preview.availability.valid && (
              <p className="text-red-700">{preview.availability.error || 'Nicht verfügbar'}</p>
            )}
            {preview.cancellationPreview && preview.diff.removed.length > 0 && (
              <p>
                Stornogebühr: {formatEuro(preview.cancellationPreview.cancellationChargeAmount)} ·
                Erstattung: {formatEuro(preview.cancellationPreview.cancellationRefundAmount)}
                {preview.cancellationPreview.tierLabel &&
                  ` (${preview.cancellationPreview.tierLabel})`}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button disabled={!canSubmit || submitting} onClick={() => void handleConfirm()}>
            {submitting ? 'Speichern…' : 'Anpassung bestätigen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
