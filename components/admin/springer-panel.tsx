'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { de as deDayPicker } from 'react-day-picker/locale'
import { CalendarIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { readApiResponse } from '@/lib/read-api-response'
import { formatWeekdayList } from '@/lib/day-care-booking'
import { toIsoDate } from '@/lib/vacation-dates'
import type { SpringerOffer, SpringerRegistration } from '@/lib/types'
import { cn } from '@/lib/utils'

type Candidate = SpringerRegistration & {
  has_open_offer?: boolean
  pet?: { id: string; name?: string | null; tierart?: string | null }
  customer?: {
    id: string
    vorname?: string | null
    nachname?: string | null
    email?: string | null
    telefonnummer?: string | null
  }
}

type CapacityInfo = {
  closed: boolean
  free: number | null
  service: { max: number | null; used: number; free: number | null }
  overall: { max: number | null; used: number; free: number | null }
}

function customerName(customer?: Candidate['customer']): string {
  if (!customer) return 'Unbekannt'
  return [customer.vorname, customer.nachname].filter(Boolean).join(' ') || 'Unbekannt'
}

function offerStatusLabel(status: string): string {
  switch (status) {
    case 'sent':
      return 'Gesendet'
    case 'draft':
      return 'Entwurf'
    case 'send_failed':
      return 'Versand fehlgeschlagen'
    case 'responded':
      return 'Angenommen'
    case 'closed':
      return 'Geschlossen'
    default:
      return status
  }
}

export function SpringerPanel() {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [openOffers, setOpenOffers] = useState<SpringerOffer[]>([])
  const [capacity, setCapacity] = useState<CapacityInfo | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const dateIso = useMemo(() => toIsoDate(selectedDate), [selectedDate])

  useEffect(() => {
    void loadCandidates(dateIso)
  }, [dateIso])

  async function loadCandidates(date: string) {
    setLoading(true)
    try {
      const response = await authenticatedFetch(
        `/api/admin/springer/candidates?date=${encodeURIComponent(date)}`
      )
      const { data, error } = await readApiResponse<{
        candidates?: Candidate[]
        openOffers?: SpringerOffer[]
        capacity?: CapacityInfo
      }>(response)

      if (error) {
        throw new Error(error)
      }

      setCandidates(data?.candidates || [])
      setOpenOffers(data?.openOffers || [])
      setCapacity(data?.capacity || null)
      setSelectedIds(new Set())
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Kandidaten konnten nicht geladen werden',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function toggleSelection(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function sendInvites() {
    if (selectedIds.size === 0) {
      toast({
        title: 'Keine Auswahl',
        description: 'Bitte wähle mindestens einen Eintrag aus.',
        variant: 'destructive',
      })
      return
    }

    setSending(true)
    try {
      const response = await authenticatedFetch('/api/admin/springer/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_date: dateIso,
          registration_ids: [...selectedIds],
        }),
      })
      const { data, error } = await readApiResponse<{
        results?: Array<{ status: string; error: string | null }>
      }>(response)

      if (error) {
        throw new Error(error)
      }

      const results = data?.results || []
      const sent = results.filter((r) => r.status === 'sent').length
      const failed = results.filter((r) => r.status !== 'sent').length

      toast({
        title: 'Einladungen versendet',
        description: `${sent} erfolgreich${failed ? `, ${failed} fehlgeschlagen` : ''}.`,
      })
      await loadCandidates(dateIso)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Versand fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  async function closeOffer(offerId: string) {
    try {
      const response = await authenticatedFetch(`/api/admin/springer/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      const { error } = await readApiResponse(response)
      if (error) {
        throw new Error(error)
      }
      toast({ title: 'Geschlossen', description: 'Das Angebot wurde geschlossen.' })
      await loadCandidates(dateIso)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Schließen fehlgeschlagen',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sage-900">Springerliste</CardTitle>
          <CardDescription>
            Freie Tagesbetreuungsplätze an Kandidaten mit passendem Wochentag anbieten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-sage-700">Datum</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[260px] justify-start text-left font-normal border-sage-300',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={deDayPicker}
                    weekStartsOn={1}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {capacity && (
              <div className="rounded-lg border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-700">
                {capacity.closed ? (
                  <span>Tag geschlossen</span>
                ) : (
                  <span>
                    Freie Kapazität Tagesbetreuung:{' '}
                    <strong className="text-sage-900">
                      {capacity.free === null ? 'k. A.' : capacity.free}
                    </strong>
                    {capacity.service.max !== null && (
                      <span className="text-sage-500">
                        {' '}
                        ({capacity.service.used}/{capacity.service.max})
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              className="bg-sage-600 hover:bg-sage-700"
              disabled={sending || selectedIds.size === 0}
              onClick={() => void sendInvites()}
            >
              {sending
                ? 'Sende…'
                : `Einladungen senden (${selectedIds.size})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sage-900">Kandidaten</CardTitle>
          <CardDescription>
            Aktive Registrierungen für diesen Wochentag
            {loading ? ' · Laden…' : ` · ${candidates.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sage-600">Keine Kandidaten für dieses Datum.</p>
          ) : (
            <div className="space-y-3">
              {candidates.map((candidate) => {
                const checked = selectedIds.has(candidate.id)
                return (
                  <label
                    key={candidate.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-sage-200 p-4 hover:bg-sage-50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        toggleSelection(candidate.id, value === true)
                      }
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sage-900">
                          {candidate.pet?.name || 'Tier'} · {customerName(candidate.customer)}
                        </p>
                        {candidate.has_open_offer && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            Offenes Angebot
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-sage-600">
                        {formatWeekdayList(candidate.weekdays)}
                        {candidate.customer?.email ? ` · ${candidate.customer.email}` : ''}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sage-900">Offene Angebote</CardTitle>
          <CardDescription>Für {format(selectedDate, 'd. MMMM yyyy', { locale: de })}</CardDescription>
        </CardHeader>
        <CardContent>
          {openOffers.length === 0 ? (
            <p className="py-8 text-center text-sage-600">Keine offenen Angebote an diesem Tag.</p>
          ) : (
            <div className="space-y-3">
              {openOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="flex flex-col gap-3 rounded-lg border border-sage-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-sage-900">
                      {offer.pet?.name || 'Tier'} ·{' '}
                      {customerName(offer.customer as Candidate['customer'])}
                    </p>
                    <p className="text-sm text-sage-600">
                      {offerStatusLabel(offer.status)}
                      {offer.sent_at
                        ? ` · gesendet ${format(new Date(offer.sent_at), 'dd.MM.yyyy HH:mm')}`
                        : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-sage-300"
                    onClick={() => void closeOffer(offer.id)}
                  >
                    Schließen
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
