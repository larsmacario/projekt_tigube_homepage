'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { BookingCalendar } from '@/components/booking-calendar'
import { useToast } from '@/hooks/use-toast'
import type { BookingRequest } from '@/lib/types'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { readApiResponse } from '@/lib/read-api-response'
import { startOfDay, toIsoDate } from '@/lib/vacation-dates'
import { getVacationPeriodsInRange } from '@/lib/booking-availability'
import type { VacationDate } from '@/lib/vacation-dates'
import { groupBookingsForDisplay } from '@/lib/booking-request-groups'
import { formatDayCareBookingSummary } from '@/lib/day-care-booking'
import { BookingGroupListCard } from '@/components/booking/booking-group-list-card'
import { BookingCancellationDialog } from '@/components/portal/booking-cancellation-dialog'

interface PortalAvailability {
  vacationPeriods: Array<{ start_date: string; end_date: string; label: string }>
  closedDates: string[]
}

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

function getStatusColor(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'cancelled':
      return 'bg-slate-100 text-slate-800 border-slate-300'
    default:
      return 'bg-sage-100 text-sage-800 border-sage-300'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'approved':
      return 'Genehmigt'
    case 'rejected':
      return 'Abgelehnt'
    case 'pending':
      return 'Ausstehend'
    case 'cancelled':
      return 'Storniert'
    default:
      return status
  }
}

export default function BookingsPage() {
  const searchParams = useSearchParams()
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null)
  const [cancellationBooking, setCancellationBooking] = useState<BookingRequest | null>(null)
  const { toast } = useToast()

  const [availability, setAvailability] = useState<PortalAvailability>({
    vacationPeriods: [],
    closedDates: [],
  })

  const today = useMemo(() => startOfDay(new Date()), [])

  async function loadAvailability() {
    try {
      const todayIso = toIsoDate(today)
      const defaultEnd = new Date(today)
      defaultEnd.setFullYear(defaultEnd.getFullYear() + 1)
      const rangeEnd = toIsoDate(defaultEnd)

      const response = await authenticatedFetch(
        `/api/portal/bookings/availability?from_date=${todayIso}&to_date=${rangeEnd}`
      )

      const { data, error } = await readApiResponse<{
        vacationPeriods?: PortalAvailability['vacationPeriods']
        closedDates?: string[]
        error?: string
      }>(response)

      let vacationPeriods = data?.vacationPeriods || []
      const closedDates = data?.closedDates || []

      if (vacationPeriods.length === 0) {
        const newsbarRes = await fetch('/api/newsbar')
        const newsbarJson = await newsbarRes.json().catch(() => ({}))
        const rawDates = (newsbarJson.vacationDates || []) as VacationDate[]
        vacationPeriods = getVacationPeriodsInRange(rawDates, todayIso, rangeEnd)
      }

      if (error && vacationPeriods.length === 0 && closedDates.length === 0) {
        console.error('Error loading availability:', error)
        return
      }

      setAvailability({ vacationPeriods, closedDates })
    } catch (error) {
      console.error('Error loading availability:', error)
    }
  }

  useEffect(() => {
    loadData()
    loadAvailability()
  }, [])

  useEffect(() => {
    if (searchParams.get('created') === '1') {
      toast({
        title: 'Anfrage gesendet',
        description: 'Deine Buchungsanfrage wurde erfolgreich übermittelt.',
      })
      window.history.replaceState({}, '', '/portal/bookings')
    }
  }, [searchParams, toast])

  async function loadData() {
    try {
      const bookingsRes = await authenticatedFetch('/api/portal/bookings')

      const bookingsResult = await readApiResponse<{ bookings?: BookingRequest[]; error?: string }>(
        bookingsRes
      )

      if (bookingsResult.error) throw new Error(bookingsResult.error)

      setBookings(bookingsResult.data?.bookings || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Laden der Daten',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleBookingCancelled(updated: BookingRequest) {
    setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)))
    setSelectedBooking((current) => (current?.id === updated.id ? updated : current))
  }

  function canCancelBooking(booking: BookingRequest): boolean {
    return booking.status === 'approved' || booking.status === 'pending'
  }

  const grouped = useMemo(() => groupBookingsForDisplay(bookings), [bookings])

  const now = new Date()
  const futureGroups = grouped.filter((g) => new Date(g.start_date) > now)
  const currentGroups = grouped.filter((g) => {
    const start = new Date(g.start_date)
    const end = g.end_date ? new Date(g.end_date) : null
    return start <= now && (!end || end >= now)
  })
  const pastGroups = grouped.filter(
    (g) => g.end_date && new Date(g.end_date) < now
  )

  const selectedGroup = selectedBooking
    ? grouped.find(
        (g) =>
          g.bookings.some((b) => b.id === selectedBooking.id) ||
          g.key === selectedBooking.id
      )
    : null

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sage-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-sage-900">Meine Buchungen</h1>
          <p className="mt-2 text-sage-600">Verwalte deine Betreuungsanfragen</p>
        </div>
        <Button className="bg-sage-600 hover:bg-sage-700" asChild>
          <Link href="/portal/bookings/new">Neue Anfrage</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kalender</CardTitle>
          <CardDescription>
            Übersicht deiner Buchungen. Amber markierte Tage sind Betriebsferien und nicht buchbar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingCalendar
            bookings={bookings}
            vacationPeriods={availability.vacationPeriods}
            closedDates={availability.closedDates}
            onSelectBooking={(booking) => setSelectedBooking(booking)}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Zukünftige Buchungen</CardTitle>
          </CardHeader>
          <CardContent>
            {futureGroups.length > 0 ? (
              <div className="space-y-3">
                {futureGroups.map((group) => (
                  <BookingGroupListCard
                    key={group.key}
                    group={group}
                    onSelect={setSelectedBooking}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sage-600">Keine zukünftigen Buchungen</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktuelle Buchungen</CardTitle>
          </CardHeader>
          <CardContent>
            {currentGroups.length > 0 ? (
              <div className="space-y-3">
                {currentGroups.map((group) => (
                  <BookingGroupListCard
                    key={group.key}
                    group={group}
                    onSelect={setSelectedBooking}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sage-600">Keine aktuellen Buchungen</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vergangene Buchungen</CardTitle>
          </CardHeader>
          <CardContent>
            {pastGroups.length > 0 ? (
              <div className="space-y-3">
                {pastGroups.map((group) => (
                  <BookingGroupListCard
                    key={group.key}
                    group={group}
                    muted
                    onSelect={setSelectedBooking}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sage-600">Keine vergangenen Buchungen</p>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedBooking && (
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buchungsdetails</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedGroup && selectedGroup.bookings.length > 1 ? (
                <div>
                  <Label>Tiere & Leistungen</Label>
                  <ul className="mt-1 list-inside list-disc text-sage-800">
                    {selectedGroup.bookings.map((b) => (
                      <li key={b.id}>
                        {b.pet?.name}: {getServiceLabel(b.service_type)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Tier</Label>
                    <p className="font-medium">{selectedBooking.pet?.name || 'Unbekannt'}</p>
                  </div>
                  <div>
                    <Label>Service</Label>
                    <p className="font-medium">{getServiceLabel(selectedBooking.service_type)}</p>
                  </div>
                </>
              )}
              <div>
                <Label>Zeitraum</Label>
                <p className="font-medium">
                  {new Date(selectedBooking.start_date).toLocaleDateString('de-DE')} –{' '}
                  {selectedBooking.end_date
                    ? new Date(selectedBooking.end_date).toLocaleDateString('de-DE')
                    : 'laufend'}
                </p>
              </div>
              {formatDayCareBookingSummary(selectedBooking) && (
                <div>
                  <Label>Tagesbetreuung</Label>
                  <p className="text-sage-700">{formatDayCareBookingSummary(selectedBooking)}</p>
                </div>
              )}
              <div>
                <Label>Status</Label>
                <Badge className={getStatusColor(selectedBooking.status)}>
                  {getStatusLabel(selectedBooking.status)}
                </Badge>
              </div>
              {selectedBooking.message && (
                <div>
                  <Label>Nachricht</Label>
                  <p className="text-sage-600">{selectedBooking.message}</p>
                </div>
              )}
              {selectedBooking.admin_notes && (
                <div>
                  <Label>Admin Notiz</Label>
                  <p className="text-sage-600">{selectedBooking.admin_notes}</p>
                </div>
              )}
              {selectedBooking.cancelled_at && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
                  <p className="font-medium text-slate-900">Stornierung</p>
                  <p>
                    Storniert am{' '}
                    {new Date(selectedBooking.cancelled_at).toLocaleString('de-DE')}
                  </p>
                  {selectedBooking.cancellation_tier_label && (
                    <p>Staffel: {selectedBooking.cancellation_tier_label}</p>
                  )}
                  {selectedBooking.cancellation_charge_amount != null && (
                    <p>
                      Stornogebühr:{' '}
                      {selectedBooking.cancellation_charge_amount.toFixed(2).replace('.', ',')} €
                    </p>
                  )}
                  {selectedBooking.cancellation_refund_amount != null && (
                    <p>
                      Erstattung:{' '}
                      {selectedBooking.cancellation_refund_amount.toFixed(2).replace('.', ',')} €
                    </p>
                  )}
                </div>
              )}
              {selectedGroup ? (
                <div className="space-y-2 border-t border-sage-200 pt-4">
                  <Label>Positionen stornieren</Label>
                  {selectedGroup.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-sage-200 p-3"
                    >
                      <div className="text-sm">
                        <p className="font-medium text-sage-900">
                          {booking.pet?.name || 'Unbekannt'}
                        </p>
                        <p className="text-sage-600">{getServiceLabel(booking.service_type)}</p>
                      </div>
                      {canCancelBooking(booking) ? (
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => setCancellationBooking(booking)}
                        >
                          Stornieren
                        </Button>
                      ) : (
                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : canCancelBooking(selectedBooking) ? (
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setCancellationBooking(selectedBooking)}
                >
                  Buchung stornieren
                </Button>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <BookingCancellationDialog
        booking={cancellationBooking}
        open={!!cancellationBooking}
        onOpenChange={(open) => {
          if (!open) setCancellationBooking(null)
        }}
        onCancelled={handleBookingCancelled}
      />
    </div>
  )
}
