'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { readApiResponse } from '@/lib/read-api-response'
import { getActiveBookingDates } from '@/lib/cancellation-booking-total'
import { formatEuro } from '@/lib/price-override'
import type { BookingRequest } from '@/lib/types'

type CancellationPreview = {
  ruleSetName: string
  tierLabel: string
  chargePercent: number
  scopeTotal: number
  cancellationChargeAmount: number
  cancellationRefundAmount: number
  fullyCancelled: boolean
}

type Props = {
  booking: BookingRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancelled: (booking: BookingRequest) => void
}

export function BookingCancellationDialog({
  booking,
  open,
  onOpenChange,
  onCancelled,
}: Props) {
  const { toast } = useToast()
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<CancellationPreview | null>(null)
  const [selectedDates, setSelectedDates] = useState<string[]>([])

  const cancellableDates = useMemo(() => {
    if (!booking) return []
    return getActiveBookingDates(booking)
  }, [booking])

  const supportsPartialDates =
    booking?.service_type === 'tagesbetreuung' && cancellableDates.length > 1

  useEffect(() => {
    if (!open || !booking) {
      setPreview(null)
      setSelectedDates([])
      return
    }

    if (supportsPartialDates) {
      setSelectedDates([])
      return
    }

    void loadPreview(booking.id)
  }, [open, booking, supportsPartialDates])

  async function loadPreview(bookingId: string, dates?: string[]) {
    setLoadingPreview(true)
    try {
      const query =
        dates && dates.length > 0
          ? `?dates=${encodeURIComponent(dates.join(','))}`
          : ''
      const response = await authenticatedFetch(
        `/api/portal/bookings/${bookingId}/cancellation${query}`
      )
      const { data, error } = await readApiResponse<{ preview?: CancellationPreview }>(response)
      if (error) throw new Error(error)
      setPreview(data?.preview ?? null)
    } catch (error) {
      toast({
        title: 'Vorschau fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      })
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleConfirm() {
    if (!booking) return
    setSubmitting(true)
    try {
      const body =
        supportsPartialDates && selectedDates.length > 0
          ? { dates: selectedDates }
          : {}

      const response = await authenticatedFetch(
        `/api/portal/bookings/${booking.id}/cancellation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      const { data, error } = await readApiResponse<{ booking?: BookingRequest }>(response)
      if (error) throw new Error(error)
      if (!data?.booking) throw new Error('Storno konnte nicht abgeschlossen werden')

      toast({
        title: 'Stornierung bestätigt',
        description: 'Wir haben deine Stornierung erhalten.',
      })
      onCancelled(data.booking)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Storno fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function toggleDate(date: string, checked: boolean) {
    setSelectedDates((current) => {
      const next = checked ? [...current, date] : current.filter((d) => d !== date)
      if (booking && next.length > 0) {
        void loadPreview(booking.id, next)
      } else {
        setPreview(null)
      }
      return next
    })
  }

  if (!booking) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Buchung stornieren</DialogTitle>
          <DialogDescription>
            {booking.pet?.name || 'Tier'} ·{' '}
            {new Date(booking.start_date).toLocaleDateString('de-DE')}
          </DialogDescription>
        </DialogHeader>

        {supportsPartialDates ? (
          <div className="space-y-3">
            <Label>Welche Betreuungstage möchtest du stornieren?</Label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-sage-200 p-3">
              {cancellableDates.map((date) => (
                <label key={date} className="flex items-center gap-2 text-sm text-sage-800">
                  <Checkbox
                    checked={selectedDates.includes(date)}
                    onCheckedChange={(checked) => toggleDate(date, checked === true)}
                  />
                  {new Date(date).toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {loadingPreview ? (
          <p className="text-sm text-sage-600">Berechnung wird geladen…</p>
        ) : preview ? (
          <div className="rounded-lg border border-sage-200 bg-sage-50/60 p-4 text-sm space-y-2">
            <p>
              <span className="font-medium">Regelwerk:</span> {preview.ruleSetName}
            </p>
            <p>
              <span className="font-medium">Staffel:</span> {preview.tierLabel}
            </p>
            <p>
              <span className="font-medium">Positionssumme:</span>{' '}
              {formatEuro(preview.scopeTotal)}
            </p>
            <p>
              <span className="font-medium">Stornogebühr:</span>{' '}
              {formatEuro(preview.cancellationChargeAmount)} ({preview.chargePercent}%)
            </p>
            <p>
              <span className="font-medium">Erstattung:</span>{' '}
              {formatEuro(preview.cancellationRefundAmount)}
            </p>
            <p className="text-xs text-sage-600 pt-2">
              Mit Bestätigung stimmst du dieser Berechnung zu. Eine Gutschrift bearbeiten wir
              separat in der Abrechnung.
            </p>
          </div>
        ) : supportsPartialDates ? (
          <p className="text-sm text-sage-600">Bitte mindestens einen Tag auswählen.</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            disabled={
              submitting ||
              loadingPreview ||
              !preview ||
              (supportsPartialDates && selectedDates.length === 0)
            }
            onClick={handleConfirm}
          >
            {submitting ? 'Wird storniert…' : 'Stornierung bestätigen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
