'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { de as deDayPicker } from 'react-day-picker/locale'
import { type DateRange } from 'react-day-picker'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { formatDateRangeDE } from '@/lib/format-date-range-de'
import {
  getDefaultSpringerWeekRange,
  shiftSpringerWeekRange,
} from '@/lib/springer-week-range'
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

type DayData = {
  date: string
  capacity: CapacityInfo
  candidates: Candidate[]
  openOffers: SpringerOffer[]
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

function formatDayHeading(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00`)
  return format(date, 'EEEE, d. MMMM yyyy', { locale: de })
}

function CapacityBadge({ capacity }: { capacity: CapacityInfo }) {
  if (capacity.closed) {
    return (
      <span className="rounded-lg border border-sage-200 bg-sage-50 px-3 py-1.5 text-sm text-sage-700">
        Tag geschlossen
      </span>
    )
  }

  return (
    <span className="rounded-lg border border-sage-200 bg-sage-50 px-3 py-1.5 text-sm text-sage-700">
      Freie Kapazität:{' '}
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
  )
}

export function SpringerPanel() {
  const { toast } = useToast()
  const defaultRange = useMemo(() => getDefaultSpringerWeekRange(), [])
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange)
  const [daysData, setDaysData] = useState<DayData[]>([])
  const [selectedIdsByDate, setSelectedIdsByDate] = useState<Record<string, Set<string>>>({})
  const [loading, setLoading] = useState(false)
  const [sendingDate, setSendingDate] = useState<string | null>(null)

  const rangeFromIso = dateRange.from ? toIsoDate(dateRange.from) : null
  const rangeToIso = dateRange.to ? toIsoDate(dateRange.to) : rangeFromIso

  const loadRange = useCallback(async () => {
    if (!rangeFromIso || !rangeToIso) return

    setLoading(true)
    try {
      const response = await authenticatedFetch(
        `/api/admin/springer/candidates?from=${encodeURIComponent(rangeFromIso)}&to=${encodeURIComponent(rangeToIso)}`
      )
      const { data, error } = await readApiResponse<{ days?: DayData[] }>(response)

      if (error) {
        throw new Error(error)
      }

      setDaysData(data?.days || [])
      setSelectedIdsByDate({})
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Daten konnten nicht geladen werden',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [rangeFromIso, rangeToIso, toast])

  useEffect(() => {
    void loadRange()
  }, [loadRange])

  function handleRangeSelect(range: DateRange | undefined) {
    if (!range?.from) return
    setDateRange({ from: range.from, to: range.to ?? range.from })
  }

  function shiftWeek(deltaWeeks: -1 | 0 | 1) {
    if (!dateRange.from || !dateRange.to) return
    const next = shiftSpringerWeekRange(
      { from: dateRange.from, to: dateRange.to },
      deltaWeeks
    )
    setDateRange(next)
  }

  function toggleSelection(dateIso: string, id: string, checked: boolean) {
    setSelectedIdsByDate((prev) => {
      const next = { ...prev }
      const daySet = new Set(next[dateIso] || [])
      if (checked) daySet.add(id)
      else daySet.delete(id)
      next[dateIso] = daySet
      return next
    })
  }

  async function sendInvites(dateIso: string) {
    const selectedIds = selectedIdsByDate[dateIso]
    if (!selectedIds || selectedIds.size === 0) {
      toast({
        title: 'Keine Auswahl',
        description: 'Bitte wähle mindestens einen Eintrag aus.',
        variant: 'destructive',
      })
      return
    }

    setSendingDate(dateIso)
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
      await loadRange()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Versand fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setSendingDate(null)
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
      await loadRange()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Schließen fehlgeschlagen',
        variant: 'destructive',
      })
    }
  }

  const rangeLabel =
    dateRange.from && dateRange.to
      ? formatDateRangeDE(dateRange.from, dateRange.to)
      : 'Zeitraum wählen'

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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-sage-700">Zeitraum</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full min-w-[260px] justify-start text-left font-normal border-sage-300 sm:w-auto',
                      !dateRange.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {rangeLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    defaultMonth={dateRange.from}
                    onSelect={handleRangeSelect}
                    locale={deDayPicker}
                    weekStartsOn={1}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-sage-300"
                onClick={() => shiftWeek(-1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Vorherige Woche
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-sage-300"
                onClick={() => shiftWeek(0)}
              >
                Kommende Woche
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-sage-300"
                onClick={() => shiftWeek(1)}
              >
                Nächste Woche
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sage-600">Laden…</CardContent>
        </Card>
      ) : daysData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sage-600">
            Keine Tage im gewählten Zeitraum.
          </CardContent>
        </Card>
      ) : (
        daysData.map((day) => {
          const selectedCount = selectedIdsByDate[day.date]?.size ?? 0
          const isSending = sendingDate === day.date

          return (
            <Card key={day.date}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-sage-900">{formatDayHeading(day.date)}</CardTitle>
                    <CardDescription>
                      {day.candidates.length} Kandidat{day.candidates.length === 1 ? '' : 'en'}
                      {day.openOffers.length > 0
                        ? ` · ${day.openOffers.length} offene Angebote`
                        : ''}
                    </CardDescription>
                  </div>
                  <CapacityBadge capacity={day.capacity} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-sage-700">Kandidaten</p>
                    <Button
                      className="bg-sage-600 hover:bg-sage-700"
                      size="sm"
                      disabled={isSending || selectedCount === 0}
                      onClick={() => void sendInvites(day.date)}
                    >
                      {isSending
                        ? 'Sende…'
                        : `Einladungen senden (${selectedCount})`}
                    </Button>
                  </div>

                  {day.candidates.length === 0 ? (
                    <p className="py-4 text-center text-sm text-sage-600">
                      Keine Kandidaten für diesen Tag.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {day.candidates.map((candidate) => {
                        const checked = selectedIdsByDate[day.date]?.has(candidate.id) ?? false
                        return (
                          <label
                            key={candidate.id}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border border-sage-200 p-4 hover:bg-sage-50"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                toggleSelection(day.date, candidate.id, value === true)
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
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium text-sage-700">Offene Angebote</p>
                  {day.openOffers.length === 0 ? (
                    <p className="py-4 text-center text-sm text-sage-600">
                      Keine offenen Angebote an diesem Tag.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {day.openOffers.map((offer) => (
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
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
