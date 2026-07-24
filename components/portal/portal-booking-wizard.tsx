'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { type DateRange } from 'react-day-picker'
import { de as deDayPicker } from 'react-day-picker/locale'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookingRangeCalendar, bookingRangeCalendarClassName } from '@/components/portal/booking-range-calendar'
import { BookingMultiDayCalendar } from '@/components/portal/booking-multi-day-calendar'
import { Calendar } from '@/components/ui/calendar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { readApiResponse } from '@/lib/read-api-response'
import {
  filterBookableExtraPrices,
  filterExtraCategoriesForServices,
  flattenPetExtraSelections,
  getBookableExtrasForService,
  type BookingExtraPrice,
  type PetExtraSelections,
} from '@/lib/booking-extras'
import {
  computeSuggestedExtraForPetLine,
  extraQuantityOverrideKey,
  formatExtraQuantityHint,
  inferExtraQuantityBehavior,
  resolvesExtraQuantityFromPeriod,
  shouldShowExtraQuantityField,
} from '@/lib/booking-extra-quantity'
import { getServicesForPetType } from '@/lib/booking-service'
import {
  isDateInVacationPeriods,
  iterateIsoDateRange,
} from '@/lib/booking-availability'
import { formatEuro } from '@/lib/price-override'
import { formatDateRangeDE } from '@/lib/format-date-range-de'
import {
  DAY_CARE_WEEKDAY_OPTIONS,
  formatSelectedDatesDE,
  isRangeService,
} from '@/lib/day-care-booking'
import type { DayCareMode } from '@/lib/types'
import { startOfDay, toIsoDate, parseIsoDate } from '@/lib/vacation-dates'
import type { BookingRequest, Pet, ServiceType } from '@/lib/types'
import { PortalBookingWizardOverview } from '@/components/portal/portal-booking-wizard-overview'
import type { BookingExtraCategory } from '@/lib/booking-extras'

const STEPS = [
  { id: 1, label: 'Tier & Leistung' },
  { id: 2, label: 'Zeitraum' },
  { id: 3, label: 'Zusatzleistungen' },
  { id: 4, label: 'Übersicht & Kosten' },
] as const

export interface PetServiceLine {
  pet_id: string
  service_type: ServiceType | ''
  day_care_mode?: DayCareMode | ''
}

interface PortalAvailability {
  vacationPeriods: Array<{ start_date: string; end_date: string; label: string }>
  closedDates: string[]
}

interface PortalBookingWizardProps {
  pets: Pet[]
  onSuccess: (bookings: BookingRequest[]) => void
  onCancel: () => void
}

export function PortalBookingWizard({
  pets,
  onSuccess,
  onCancel,
}: PortalBookingWizardProps) {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [petLines, setPetLines] = useState<PetServiceLine[]>([{ pet_id: '', service_type: '' }])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [dayCareOnceDates, setDayCareOnceDates] = useState<Record<string, Date[]>>({})
  const [dayCareRecurring, setDayCareRecurring] = useState<
    Record<string, { weekdays: number[]; startDate?: Date }>
  >({})
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfDay(new Date()))
  const [message, setMessage] = useState('')
  const [availability, setAvailability] = useState<PortalAvailability>({
    vacationPeriods: [],
    closedDates: [],
  })
  const [extraPrices, setExtraPrices] = useState<BookingExtraPrice[]>([])
  const [catalogPrices, setCatalogPrices] = useState<BookingExtraPrice[]>([])
  const [priceCategories, setPriceCategories] = useState<BookingExtraCategory[]>([])
  const [pricesLoading, setPricesLoading] = useState(false)
  const [selectedExtrasByPet, setSelectedExtrasByPet] = useState<PetExtraSelections>({})
  const [extraQuantityOverrides, setExtraQuantityOverrides] = useState<Set<string>>(() => new Set())
  const [submitting, setSubmitting] = useState(false)

  const today = useMemo(() => startOfDay(new Date()), [])

  const resolvedPetLines = useMemo(
    () => petLines.filter((line) => line.pet_id && line.service_type),
    [petLines]
  )

  const serviceTypes = useMemo(
    () => [...new Set(resolvedPetLines.map((l) => l.service_type as ServiceType))],
    [resolvedPetLines]
  )

  const usedPetIds = useMemo(
    () => new Set(petLines.map((l) => l.pet_id).filter(Boolean)),
    [petLines]
  )

  const rangePetLines = useMemo(
    () => resolvedPetLines.filter((l) => isRangeService(l.service_type as ServiceType)),
    [resolvedPetLines]
  )

  const dayCareOnceLines = useMemo(
    () =>
      resolvedPetLines.filter(
        (l) => l.service_type === 'tagesbetreuung' && l.day_care_mode === 'once'
      ),
    [resolvedPetLines]
  )

  const dayCareRecurringLines = useMemo(
    () =>
      resolvedPetLines.filter(
        (l) => l.service_type === 'tagesbetreuung' && l.day_care_mode === 'recurring'
      ),
    [resolvedPetLines]
  )

  const loadAvailability = useCallback(async () => {
    try {
      const todayIso = toIsoDate(today)
      const defaultEnd = new Date(today)
      defaultEnd.setFullYear(defaultEnd.getFullYear() + 1)
      const rangeEnd = toIsoDate(defaultEnd)

      const query =
        serviceTypes.length > 0
          ? `/api/portal/bookings/availability?service_types=${serviceTypes.join(',')}&from_date=${todayIso}&to_date=${rangeEnd}`
          : `/api/portal/bookings/availability?from_date=${todayIso}&to_date=${rangeEnd}`

      const response = await authenticatedFetch(query)
      const { data, error } = await readApiResponse<{
        vacationPeriods?: PortalAvailability['vacationPeriods']
        closedDates?: string[]
        error?: string
      }>(response)

      if (error && !data?.vacationPeriods?.length) {
        console.error('Error loading availability:', error)
        return
      }

      setAvailability({
        vacationPeriods: data?.vacationPeriods || [],
        closedDates: data?.closedDates || [],
      })
    } catch (error) {
      console.error('Error loading availability:', error)
    }
  }, [serviceTypes, today])

  const loadPriceCatalog = useCallback(async () => {
    if (serviceTypes.length === 0) {
      setExtraPrices([])
      setCatalogPrices([])
      setPriceCategories([])
      return
    }

    setPricesLoading(true)
    try {
      const response = await authenticatedFetch('/api/prices')
      const data = await response.json()
      const categories = (data.categories || []) as BookingExtraCategory[]
      const prices = (data.prices || []) as BookingExtraPrice[]
      setPriceCategories(categories)
      setCatalogPrices(prices)
      const extraCategories = filterExtraCategoriesForServices(categories, serviceTypes)
      const categoryIds = new Set(extraCategories.map((c) => c.id))
      setExtraPrices(filterBookableExtraPrices(prices, categoryIds))
    } catch (error) {
      console.error('Error loading prices:', error)
    } finally {
      setPricesLoading(false)
    }
  }, [serviceTypes])

  useEffect(() => {
    if (step >= 2) {
      loadAvailability()
    }
  }, [step, loadAvailability])

  useEffect(() => {
    if (step >= 3) {
      loadPriceCatalog()
    }
  }, [step, loadPriceCatalog])

  useEffect(() => {
    if (step < 3) return

    const catalog = catalogPrices.length > 0 ? catalogPrices : extraPrices

    setSelectedExtrasByPet((prev) => {
      let changed = false
      const next: PetExtraSelections = { ...prev }

      for (const line of resolvedPetLines) {
        const selections = next[line.pet_id]
        if (!selections) continue

        const petExtraPrices = getBookableExtrasForService(
          catalog,
          priceCategories,
          line.service_type as ServiceType
        )

        for (const priceId of Object.keys(selections)) {
          const overrideKey = extraQuantityOverrideKey(line.pet_id, priceId)
          if (extraQuantityOverrides.has(overrideKey)) continue

          const extraPrice = petExtraPrices.find((p) => p.id === priceId)
          if (!extraPrice) continue

          const behavior = inferExtraQuantityBehavior(extraPrice)
          if (!resolvesExtraQuantityFromPeriod(behavior)) continue

          const { quantity } = computeSuggestedExtraForPetLine(
            {
              pet_id: line.pet_id,
              service_type: line.service_type as ServiceType,
              day_care_mode: line.day_care_mode,
            },
            extraPrice,
            dateRange,
            dayCareOnceDates
          )

          if (selections[priceId] !== quantity) {
            changed = true
            next[line.pet_id] = { ...selections, [priceId]: quantity }
          }
        }
      }

      return changed ? next : prev
    })
  }, [
    step,
    dateRange,
    dayCareOnceDates,
    resolvedPetLines,
    catalogPrices,
    extraPrices,
    priceCategories,
    extraQuantityOverrides,
  ])

  const isDateUnavailable = useCallback(
    (date: Date) => {
      const day = startOfDay(date)
      if (day < today) return true
      const isoDate = toIsoDate(day)
      if (availability.closedDates.includes(isoDate)) return true
      return isDateInVacationPeriods(isoDate, availability.vacationPeriods)
    },
    [availability, today]
  )

  const calendarDefaultMonth = useMemo(() => {
    if (dateRange?.from) return dateRange.from
    const todayIso = toIsoDate(today)
    const upcomingVacation = availability.vacationPeriods.find(
      (period) => period.end_date >= todayIso
    )
    if (upcomingVacation) {
      return parseIsoDate(upcomingVacation.start_date) ?? today
    }
    return today
  }, [availability.vacationPeriods, dateRange?.from, today])

  function updatePetLine(index: number, patch: Partial<PetServiceLine>) {
    setPetLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line
        const next = { ...line, ...patch }
        if (patch.service_type && patch.service_type !== 'tagesbetreuung') {
          next.day_care_mode = ''
        }
        if (patch.pet_id && patch.pet_id !== line.pet_id) {
          next.day_care_mode = ''
        }
        return next
      })
    )
  }

  function addPetLine() {
    setPetLines((prev) => [...prev, { pet_id: '', service_type: '' }])
  }

  function removePetLine(index: number) {
    setPetLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  function validateStep1(): boolean {
    if (resolvedPetLines.length === 0) {
      toast({
        title: 'Fehler',
        description: 'Bitte wähle mindestens ein Tier und einen Service.',
        variant: 'destructive',
      })
      return false
    }
    if (petLines.some((line) => line.pet_id && !line.service_type)) {
      toast({
        title: 'Fehler',
        description: 'Bitte wähle für jedes Tier einen Service.',
        variant: 'destructive',
      })
      return false
    }
    for (const line of resolvedPetLines) {
      if (line.service_type === 'tagesbetreuung' && !line.day_care_mode) {
        toast({
          title: 'Fehler',
          description: 'Bitte wähle bei Tagesbetreuung einmalig oder feste Wochentage.',
          variant: 'destructive',
        })
        return false
      }
    }
    return true
  }

  function datesBlocked(isoDates: string[]): boolean {
    return isoDates.some((date) => {
      if (availability.closedDates.includes(date)) return true
      return isDateInVacationPeriods(date, availability.vacationPeriods)
    })
  }

  function validateStep2(): boolean {
    if (rangePetLines.length > 0) {
      const startDate = dateRange?.from
      const endDate = dateRange?.to ?? dateRange?.from
      if (!startDate || !endDate) {
        toast({
          title: 'Fehler',
          description: 'Bitte wähle einen Zeitraum für Urlaubs- oder Katzenbetreuung.',
          variant: 'destructive',
        })
        return false
      }
      const startIso = toIsoDate(startDate)
      const endIso = toIsoDate(endDate)
      if (datesBlocked(iterateIsoDateRange(startIso, endIso))) {
        toast({
          title: 'Fehler',
          description:
            'Der gewählte Zeitraum ist wegen Betriebsferien oder Schließtagen nicht verfügbar.',
          variant: 'destructive',
        })
        return false
      }
    }

    for (const line of dayCareOnceLines) {
      const dates = dayCareOnceDates[line.pet_id] || []
      if (dates.length === 0) {
        toast({
          title: 'Fehler',
          description: 'Bitte wähle mindestens einen Tag für die Tagesbetreuung.',
          variant: 'destructive',
        })
        return false
      }
      const isoList = dates.map((d) => toIsoDate(startOfDay(d)))
      if (datesBlocked(isoList)) {
        toast({
          title: 'Fehler',
          description: 'Ein gewählter Tag ist wegen Ferien oder Schließtag nicht verfügbar.',
          variant: 'destructive',
        })
        return false
      }
    }

    for (const line of dayCareRecurringLines) {
      const cfg = dayCareRecurring[line.pet_id]
      if (!cfg?.weekdays?.length) {
        toast({
          title: 'Fehler',
          description: 'Bitte wähle mindestens einen Wochentag.',
          variant: 'destructive',
        })
        return false
      }
      if (!cfg.startDate) {
        toast({
          title: 'Fehler',
          description: 'Bitte wähle ein Startdatum für die festen Tage.',
          variant: 'destructive',
        })
        return false
      }
      const startIso = toIsoDate(startOfDay(cfg.startDate))
      if (datesBlocked([startIso])) {
        toast({
          title: 'Fehler',
          description: 'Das Startdatum ist wegen Ferien oder Schließtag nicht verfügbar.',
          variant: 'destructive',
        })
        return false
      }
    }

    if (
      rangePetLines.length === 0 &&
      dayCareOnceLines.length === 0 &&
      dayCareRecurringLines.length === 0
    ) {
      toast({
        title: 'Fehler',
        description: 'Bitte wähle Termine für die Betreuung.',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  function handleRangeSelect(range: DateRange | undefined) {
    if (!range?.from) {
      setDateRange(range)
      return
    }

    const from = startOfDay(range.from)
    const to = range.to ? startOfDay(range.to) : undefined

    if (to) {
      const blocked = iterateIsoDateRange(toIsoDate(from), toIsoDate(to)).some((date) => {
        if (availability.closedDates.includes(date)) return true
        return isDateInVacationPeriods(date, availability.vacationPeriods)
      })

      if (blocked) {
        toast({
          title: 'Zeitraum nicht möglich',
          description: 'Der gewählte Bereich enthält Betriebsferien oder Schließtage.',
          variant: 'destructive',
        })
        setDateRange({ from, to: undefined })
        return
      }
    }

    setDateRange({ from, to })
  }

  async function handleSubmit() {
    if (!validateStep2()) return

    const hasRange = rangePetLines.length > 0
    const startIso = hasRange && dateRange?.from ? toIsoDate(dateRange.from) : undefined
    const endIso =
      hasRange && dateRange?.from
        ? toIsoDate(dateRange.to ?? dateRange.from)
        : undefined

    const extras = flattenPetExtraSelections(
      resolvedPetLines.map((l) => l.pet_id),
      selectedExtrasByPet
    )

    const petsPayload = resolvedPetLines.map((line) => {
      if (line.service_type === 'tagesbetreuung' && line.day_care_mode === 'once') {
        return {
          pet_id: line.pet_id,
          service_type: line.service_type,
          day_care_mode: 'once' as const,
          selected_dates: (dayCareOnceDates[line.pet_id] || [])
            .map((d) => toIsoDate(startOfDay(d)))
            .sort(),
        }
      }
      if (line.service_type === 'tagesbetreuung' && line.day_care_mode === 'recurring') {
        const cfg = dayCareRecurring[line.pet_id]
        return {
          pet_id: line.pet_id,
          service_type: line.service_type,
          day_care_mode: 'recurring' as const,
          day_care_weekdays: cfg?.weekdays || [],
          start_date: cfg?.startDate ? toIsoDate(startOfDay(cfg.startDate)) : undefined,
        }
      }
      return {
        pet_id: line.pet_id,
        service_type: line.service_type,
      }
    })

    setSubmitting(true)
    try {
      const response = await authenticatedFetch('/api/portal/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: startIso,
          end_date: endIso,
          message: message || null,
          pets: petsPayload,
          extras,
        }),
      })

      const { data, error } = await readApiResponse<{
        bookings?: BookingRequest[]
        booking?: BookingRequest
        error?: string
      }>(response)

      if (error || !response.ok) {
        throw new Error(error || 'Fehler beim Erstellen der Anfrage')
      }

      const created = data?.bookings ?? (data?.booking ? [data.booking] : [])
      onSuccess(created)
      toast({
        title: 'Erfolg',
        description: 'Buchungsanfrage wurde erfolgreich erstellt',
      })
    } catch (err: unknown) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Fehler beim Erstellen der Anfrage',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function toggleExtra(
    line: PetServiceLine,
    extraPrice: BookingExtraPrice,
    checked: boolean
  ) {
    const petId = line.pet_id
    const priceId = extraPrice.id
    const overrideKey = extraQuantityOverrideKey(petId, priceId)

    setExtraQuantityOverrides((prev) => {
      const next = new Set(prev)
      next.delete(overrideKey)
      return next
    })

    setSelectedExtrasByPet((prev) => {
      const petSelections = { ...(prev[petId] || {}) }
      if (checked) {
        const { quantity } = computeSuggestedExtraForPetLine(
          {
            pet_id: line.pet_id,
            service_type: line.service_type as ServiceType,
            day_care_mode: line.day_care_mode,
          },
          extraPrice,
          dateRange,
          dayCareOnceDates
        )
        petSelections[priceId] = quantity
      } else {
        delete petSelections[priceId]
      }
      const next = { ...prev }
      if (Object.keys(petSelections).length === 0) {
        delete next[petId]
      } else {
        next[petId] = petSelections
      }
      return next
    })
  }

  function setExtraQuantityFromUser(petId: string, priceId: string, quantity: number) {
    setExtraQuantityOverrides((prev) => new Set(prev).add(extraQuantityOverrideKey(petId, priceId)))
    setSelectedExtrasByPet((prev) => ({
      ...prev,
      [petId]: {
        ...(prev[petId] || {}),
        [priceId]: quantity,
      },
    }))
  }

  function applySuggestedExtraQuantity(line: PetServiceLine, extraPrice: BookingExtraPrice) {
    const petId = line.pet_id
    const priceId = extraPrice.id
    const overrideKey = extraQuantityOverrideKey(petId, priceId)

    setExtraQuantityOverrides((prev) => {
      const next = new Set(prev)
      next.delete(overrideKey)
      return next
    })

    const { quantity } = computeSuggestedExtraForPetLine(
      {
        pet_id: line.pet_id,
        service_type: line.service_type as ServiceType,
        day_care_mode: line.day_care_mode,
      },
      extraPrice,
      dateRange,
      dayCareOnceDates
    )

    setSelectedExtrasByPet((prev) => ({
      ...prev,
      [petId]: {
        ...(prev[petId] || {}),
        [priceId]: quantity,
      },
    }))
  }

  function formatExtraPrice(price: BookingExtraPrice): string {
    if (price.price_type === 'percentage') {
      return `+${price.final_price ?? price.price ?? 0}%${price.unit ? ` ${price.unit}` : ''}`
    }
    const amount = price.final_price ?? price.price
    if (amount == null) return ''
    return `${formatEuro(amount)}${price.unit ? ` ${price.unit}` : ''}`
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <nav aria-label="Fortschritt" className="flex shrink-0 gap-2">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`flex-1 rounded-md border px-2 py-2 text-center text-xs font-medium sm:text-sm ${
              step === s.id
                ? 'border-sage-600 bg-sage-100 text-sage-900'
                : step > s.id
                  ? 'border-sage-300 bg-sage-50 text-sage-700'
                  : 'border-sage-200 text-sage-500'
            }`}
          >
            {s.id}. {s.label}
          </div>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-sage-600">
            Wähle ein oder mehrere Tiere und die passende Leistung pro Tier.
          </p>
          {petLines.map((line, index) => {
            const pet = pets.find((p) => p.id === line.pet_id)
            const services = getServicesForPetType(pet?.tierart)
            return (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-sage-200 bg-sage-50/50 p-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <div>
                  <Label>Tier</Label>
                  <Select
                    value={line.pet_id}
                    onValueChange={(value) =>
                      updatePetLine(index, { pet_id: value, service_type: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tier auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          disabled={usedPetIds.has(p.id) && p.id !== line.pet_id}
                        >
                          {p.name} ({p.tierart || 'unbekannt'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Leistung</Label>
                  <Select
                    value={line.service_type}
                    onValueChange={(value) =>
                      updatePetLine(index, { service_type: value as ServiceType })
                    }
                    disabled={!line.pet_id || services.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Leistung wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {line.service_type === 'tagesbetreuung' && line.pet_id && (
                  <div className="sm:col-span-2">
                    <Label className="text-sm">Art der Tagesbetreuung</Label>
                    <RadioGroup
                      className="mt-2 flex flex-wrap gap-4"
                      value={line.day_care_mode || ''}
                      onValueChange={(value) =>
                        updatePetLine(index, { day_care_mode: value as DayCareMode })
                      }
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="once" id={`dc-once-${index}`} />
                        <Label htmlFor={`dc-once-${index}`} className="font-normal cursor-pointer">
                          Einmalig
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="recurring" id={`dc-rec-${index}`} />
                        <Label htmlFor={`dc-rec-${index}`} className="font-normal cursor-pointer">
                          Feste Wochentage
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={petLines.length <= 1}
                    onClick={() => removePetLine(index)}
                    aria-label="Tier entfernen"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
          {pets.length > 1 && usedPetIds.size < pets.length && (
            <Button type="button" variant="outline" size="sm" onClick={addPetLine}>
              <Plus className="mr-1 size-4" />
              Weiteres Tier
            </Button>
          )}
          {pets.length === 0 && (
            <p className="text-sm text-sage-600">
              Bitte füge zuerst ein Tier in deinem Profil hinzu.
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {rangePetLines.length > 0 && (
            <div className="space-y-3">
              <Label>Zeitraum (Urlaubs- / Katzenbetreuung)</Label>
              <div className="flex justify-center rounded-xl border border-sage-200/80 bg-sage-50/80 p-3">
                <BookingRangeCalendar
                  selected={dateRange}
                  onSelect={handleRangeSelect}
                  disabled={isDateUnavailable}
                  vacationPeriods={availability.vacationPeriods}
                  closedDates={availability.closedDates}
                  defaultMonth={calendarDefaultMonth}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                />
              </div>
              {dateRange?.from && (
                <p className="text-muted-foreground text-center text-sm">
                  {formatDateRangeDE(dateRange.from, dateRange.to ?? dateRange.from)}
                </p>
              )}
            </div>
          )}

          {dayCareOnceLines.map((line) => {
            const pet = pets.find((p) => p.id === line.pet_id)
            return (
              <div key={line.pet_id} className="space-y-3">
                <Label>
                  Tagesbetreuung einmalig{pet ? ` – ${pet.name}` : ''}
                </Label>
                <p className="text-sm text-sage-600">
                  Wähle einzelne Betreuungstage (mehrere möglich).
                </p>
                <div className="flex justify-center rounded-xl border border-sage-200/80 bg-sage-50/80 p-3">
                  <BookingMultiDayCalendar
                    selected={dayCareOnceDates[line.pet_id] || []}
                    onSelect={(dates) =>
                      setDayCareOnceDates((prev) => ({
                        ...prev,
                        [line.pet_id]: dates || [],
                      }))
                    }
                    disabled={isDateUnavailable}
                    vacationPeriods={availability.vacationPeriods}
                    closedDates={availability.closedDates}
                    defaultMonth={calendarDefaultMonth}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                  />
                </div>
                {(dayCareOnceDates[line.pet_id]?.length ?? 0) > 0 && (
                  <p className="text-center text-sm text-sage-700">
                    {formatSelectedDatesDE(
                      (dayCareOnceDates[line.pet_id] || []).map((d) => toIsoDate(startOfDay(d)))
                    )}
                  </p>
                )}
              </div>
            )
          })}

          {dayCareRecurringLines.map((line) => {
            const pet = pets.find((p) => p.id === line.pet_id)
            const cfg = dayCareRecurring[line.pet_id] || { weekdays: [] }
            return (
              <div key={line.pet_id} className="space-y-3 rounded-lg border border-sage-200 p-3">
                <Label>
                  Feste Wochentage{pet ? ` – ${pet.name}` : ''}
                </Label>
                <p className="text-sm text-sage-600">
                  An welchen Wochentagen und ab wann soll die Tagesbetreuung laufen?
                </p>
                <div className="flex flex-wrap gap-2">
                  {DAY_CARE_WEEKDAY_OPTIONS.map((day) => {
                    const active = cfg.weekdays.includes(day.iso)
                    return (
                      <Button
                        key={day.iso}
                        type="button"
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        className={active ? 'bg-sage-600 hover:bg-sage-700' : ''}
                        onClick={() => {
                          setDayCareRecurring((prev) => {
                            const current = prev[line.pet_id] || { weekdays: [] }
                            const nextDays = active
                              ? current.weekdays.filter((d) => d !== day.iso)
                              : [...current.weekdays, day.iso].sort()
                            return {
                              ...prev,
                              [line.pet_id]: { ...current, weekdays: nextDays },
                            }
                          })
                        }}
                      >
                        {day.label}
                      </Button>
                    )
                  })}
                </div>
                <div>
                  <Label>Startdatum</Label>
                  <div className="mt-2 flex justify-center rounded-xl border border-sage-200/80 bg-sage-50/80 p-3">
                    <Calendar
                      mode="single"
                      locale={deDayPicker}
                      weekStartsOn={1}
                      selected={cfg.startDate}
                      onSelect={(date) =>
                        setDayCareRecurring((prev) => ({
                          ...prev,
                          [line.pet_id]: {
                            ...(prev[line.pet_id] || { weekdays: cfg.weekdays }),
                            startDate: date ? startOfDay(date) : undefined,
                          },
                        }))
                      }
                      disabled={isDateUnavailable}
                      className={bookingRangeCalendarClassName}
                    />
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex flex-wrap gap-3 text-xs text-sage-600">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-3 rounded-sm border border-amber-200 bg-amber-100" />
              Betriebsferien
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-3 rounded-sm border border-sage-300 bg-sage-200" />
              Schließtag
            </span>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <p className="text-sm text-sage-600">
            Zusatzleistungen wählst du pro Tier. Wir schlagen Mengen aus deinem Zeitraum vor (z. B.
            Tage oder Fütterungen pro Tag) – du kannst jede Menge jederzeit anpassen. Prozentzuschläge
            beziehen sich auf den jeweiligen Tagespreis des Tieres.
          </p>
          {resolvedPetLines.map((line) => {
            const pet = pets.find((p) => p.id === line.pet_id)
            const petExtraPrices = getBookableExtrasForService(
              catalogPrices.length > 0 ? catalogPrices : extraPrices,
              priceCategories,
              line.service_type as ServiceType
            )
            const petSelections = selectedExtrasByPet[line.pet_id] || {}

            return (
              <div
                key={line.pet_id}
                className="space-y-3 rounded-lg border border-sage-200 bg-sage-50/40 p-3"
              >
                <p className="font-medium text-sage-900">
                  {pet?.name ?? 'Tier'} – Zusatzleistungen (optional)
                </p>
                {petExtraPrices.length === 0 ? (
                  <p className="text-sm text-sage-600">
                    Keine Zusatzleistungen für diese Leistung.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {petExtraPrices.map((extraPrice) => {
                      const checked = extraPrice.id in petSelections
                      const qty = petSelections[extraPrice.id] ?? 1
                      const { behavior, dayCount, quantity: suggestedQty } =
                        computeSuggestedExtraForPetLine(
                          {
                            pet_id: line.pet_id,
                            service_type: line.service_type as ServiceType,
                            day_care_mode: line.day_care_mode,
                          },
                          extraPrice,
                          dateRange,
                          dayCareOnceDates
                        )
                      const hint = formatExtraQuantityHint(
                        extraPrice,
                        behavior,
                        dayCount,
                        suggestedQty
                      )
                      const overrideKey = extraQuantityOverrideKey(line.pet_id, extraPrice.id)
                      const hasOverride = extraQuantityOverrides.has(overrideKey)
                      const showQuantity = checked && shouldShowExtraQuantityField(extraPrice)

                      return (
                        <li
                          key={extraPrice.id}
                          className="flex flex-wrap items-start gap-3 rounded-md border border-sage-200 bg-white p-3"
                        >
                          <Checkbox
                            id={`extra-${line.pet_id}-${extraPrice.id}`}
                            checked={checked}
                            onCheckedChange={(v) =>
                              toggleExtra(line, extraPrice, v === true)
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <label
                              htmlFor={`extra-${line.pet_id}-${extraPrice.id}`}
                              className="cursor-pointer font-medium text-sage-900"
                            >
                              {extraPrice.name}
                            </label>
                            {extraPrice.description && (
                              <p className="text-sm text-sage-600">{extraPrice.description}</p>
                            )}
                            <p className="text-sm font-semibold text-sage-800">
                              {formatExtraPrice(extraPrice)}
                            </p>
                            {checked && hint && (
                              <p className="mt-1 text-xs text-sage-600">{hint}</p>
                            )}
                            {checked &&
                              hasOverride &&
                              resolvesExtraQuantityFromPeriod(behavior) && (
                                <Button
                                  type="button"
                                  variant="link"
                                  className="h-auto p-0 text-xs text-sage-700"
                                  onClick={() =>
                                    applySuggestedExtraQuantity(line, extraPrice)
                                  }
                                >
                                  Vorschlag übernehmen
                                </Button>
                              )}
                          </div>
                          {showQuantity && (
                            <div className="w-24">
                              <Label className="text-xs">Menge</Label>
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                value={qty}
                                onChange={(e) => {
                                  const n = parseInt(e.target.value, 10)
                                  setExtraQuantityFromUser(
                                    line.pet_id,
                                    extraPrice.id,
                                    Number.isNaN(n) || n < 1 ? 1 : n
                                  )
                                }}
                              />
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {step === 4 && (
        <PortalBookingWizardOverview
          pets={pets}
          resolvedPetLines={resolvedPetLines}
          rangePetLines={rangePetLines}
          dayCareOnceLines={dayCareOnceLines}
          dayCareRecurringLines={dayCareRecurringLines}
          dateRange={dateRange}
          dayCareOnceDates={dayCareOnceDates}
          dayCareRecurring={dayCareRecurring}
          selectedExtrasByPet={selectedExtrasByPet}
          catalogPrices={catalogPrices}
          priceCategories={priceCategories}
          message={message}
          onMessageChange={setMessage}
          pricesLoading={pricesLoading}
        />
      )}
      </div>

      <div className="flex shrink-0 justify-between gap-2 border-t border-sage-100 pt-4">
        <Button type="button" variant="outline" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
          {step === 1 ? 'Abbrechen' : 'Zurück'}
        </Button>
        {step < 4 ? (
          <Button
            type="button"
            onClick={() => {
              if (step === 1 && validateStep1()) setStep(2)
              else if (step === 2 && validateStep2()) setStep(3)
              else if (step === 3) setStep(4)
            }}
            disabled={pets.length === 0}
          >
            Weiter
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={submitting || pets.length === 0}>
            {submitting ? 'Wird gesendet…' : 'Anfrage stellen'}
          </Button>
        )}
      </div>
    </div>
  )
}
