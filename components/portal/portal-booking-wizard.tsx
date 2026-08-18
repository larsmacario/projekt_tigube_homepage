'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type DateRange } from 'react-day-picker'
import { de as deDayPicker } from 'react-day-picker/locale'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSidebar } from '@/components/ui/sidebar'
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
import { mergeKundenportalData } from '@/lib/cms/portal-defaults'
import { buildPublicHolidayDateSet } from '@/lib/public-holidays-de'
import {
  defaultPickupTimeDefaults,
  resolveDefaultPickupTimesForSpan,
} from '@/lib/pickup-time-defaults'
import { resolvePickupDateSpan } from '@/lib/pickup-date-span'
import {
  evaluatePickupTimeOnDate,
  isValidTimeHHmm,
  needsOutOfHoursPickupFee,
  PICKUP_TIME_EARLY_ARRIVAL_NOTE,
  PICKUP_TIME_MIDDAY_NOTE,
  resolveOutOfHoursPickupUnitPrice,
} from '@/lib/pickup-time-surcharge'
import { readApiResponse } from '@/lib/read-api-response'
import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'
import { getServicesForPetType } from '@/lib/booking-service'
import {
  isDateInVacationPeriods,
  iterateIsoDateRange,
} from '@/lib/booking-availability'
import { formatEuro } from '@/lib/price-override'
import { cn } from '@/lib/utils'
import { formatDateRangeDE } from '@/lib/format-date-range-de'
import {
  DAY_CARE_WEEKDAY_OPTIONS,
  formatSelectedDatesDE,
  isRangeService,
} from '@/lib/day-care-booking'
import type { DayCareMode } from '@/lib/types'
import { startOfDay, toIsoDate, parseIsoDate } from '@/lib/vacation-dates'
import type { BookingRequest, AddonService, Pet, ServiceType } from '@/lib/types'
import { PortalBookingWizardOverview } from '@/components/portal/portal-booking-wizard-overview'
import {
  PortalBookingCarePlanSection,
  selectedPetsHaveCompleteCarePlans,
  type PortalBookingCarePlanSectionHandle,
} from '@/components/portal/portal-booking-care-plan-section'

const OVERVIEW_STEP = 4
const ADDON_STEP = 3

function PickupTimesFields({
  dropOffTime,
  pickUpTime,
  onDropOffChange,
  onPickUpChange,
  compact = false,
  pickupSpan,
  publicHolidays,
  prices,
  categories,
  pickupTimesNote,
}: {
  dropOffTime: string
  pickUpTime: string
  onDropOffChange: (value: string) => void
  onPickUpChange: (value: string) => void
  compact?: boolean
  pickupSpan?: { start: string; end: string } | null
  publicHolidays?: Array<{ date: string }>
  prices?: BookingExtraPrice[]
  categories?: BookingExtraCategory[]
  pickupTimesNote?: string
}) {
  const holidaySet = useMemo(
    () => buildPublicHolidayDateSet(publicHolidays ?? []),
    [publicHolidays]
  )

  const outOfHoursFee = useMemo(() => {
    if (!prices?.length || !categories?.length) return null
    return resolveOutOfHoursPickupUnitPrice(prices, categories)
  }, [prices, categories])

  const dropEval =
    pickupSpan && dropOffTime && isValidTimeHHmm(dropOffTime)
      ? evaluatePickupTimeOnDate(pickupSpan.start, dropOffTime, holidaySet)
      : null
  const pickEval =
    pickupSpan && pickUpTime && isValidTimeHHmm(pickUpTime)
      ? evaluatePickupTimeOnDate(pickupSpan.end, pickUpTime, holidaySet)
      : null

  const dropFee = dropEval && needsOutOfHoursPickupFee(dropEval)
  const pickFee = pickEval && needsOutOfHoursPickupFee(pickEval)
  const middayNote =
    (dropEval?.middayAppointmentNote || pickEval?.middayAppointmentNote) ?? false
  const earlyNote =
    (dropEval?.earlyArrivalNote || pickEval?.earlyArrivalNote) ?? false

  const hint = (
    <p className="text-sm text-sage-600">
      Wann möchtest du deinen Hund bringen und wieder abholen? Standardzeiten findest du im
      Kundenportal unter „Bring- und Holzeiten“. Bei Tagesbetreuung gilt: erster bzw. letzter
      Betreuungstag.
    </p>
  )

  const notes = (
    <div className="space-y-2 md:col-span-2">
      {pickupTimesNote?.trim() && (
        <p className="text-sm text-sage-600">{pickupTimesNote.trim()}</p>
      )}
      {middayNote && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {PICKUP_TIME_MIDDAY_NOTE}
        </p>
      )}
      {earlyNote && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {PICKUP_TIME_EARLY_ARRIVAL_NOTE}
        </p>
      )}
      {(dropFee || pickFee) && outOfHoursFee != null && (
        <p className="rounded-md border border-sage-300 bg-sage-100 px-3 py-2 text-sm text-sage-900">
          {dropFee && pickFee
            ? `Bringen und Abholen außerhalb der Standardzeiten: je ${formatEuro(outOfHoursFee)} Zuschlag (${formatEuro(outOfHoursFee * 2)} gesamt).`
            : dropFee
              ? `Bringen außerhalb der Standardzeit: ${formatEuro(outOfHoursFee)} Zuschlag pro Termin.`
              : `Abholen außerhalb der Standardzeit: ${formatEuro(outOfHoursFee)} Zuschlag pro Termin.`}
        </p>
      )}
    </div>
  )

  const fields = (
    <>
      <div className="space-y-1">
        <Label htmlFor="drop-off-time">Bringen (am ersten Tag)</Label>
        <Input
          id="drop-off-time"
          type="time"
          value={dropOffTime}
          onChange={(e) => onDropOffChange(e.target.value)}
          className="bg-white"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pick-up-time">Abholen (am letzten Tag)</Label>
        <Input
          id="pick-up-time"
          type="time"
          value={pickUpTime}
          onChange={(e) => onPickUpChange(e.target.value)}
          className="bg-white"
          required
        />
      </div>
    </>
  )

  if (compact) {
    return (
      <div className="space-y-4">
        {hint}
        {fields}
        {notes}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2">{hint}</div>
      {fields}
      {notes}
    </div>
  )
}

export interface PetServiceLine {
  pet_id: string
  service_type: ServiceType | ''
  day_care_mode?: DayCareMode | ''
}

interface PortalAvailability {
  vacationPeriods: Array<{ start_date: string; end_date: string; label: string }>
  closedDates: string[]
  publicHolidays: Array<{ date: string; name?: string }>
}

interface PortalBookingWizardProps {
  pets: Pet[]
  onSuccess: (bookings: BookingRequest[]) => void
  onCancel: () => void
}

export function PortalBookingWizard({
  pets: initialPets,
  onSuccess,
  onCancel,
}: PortalBookingWizardProps) {
  const { toast } = useToast()
  const { state: sidebarState, isMobile } = useSidebar()
  const [wizardPets, setWizardPets] = useState<Pet[]>(() =>
    initialPets.filter((pet) => !pet.deceased_at)
  )
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
    publicHolidays: [],
  })
  const [dropOffTime, setDropOffTime] = useState('')
  const [pickUpTime, setPickUpTime] = useState('')
  const [dropOffTimeTouched, setDropOffTimeTouched] = useState(false)
  const [pickUpTimeTouched, setPickUpTimeTouched] = useState(false)
  const [pickupTimeDefaults, setPickupTimeDefaults] = useState(defaultPickupTimeDefaults)
  const [pickupTimesNote, setPickupTimesNote] = useState('')
  const [addonServices, setAddonServices] = useState<AddonService[]>([])
  const [addonsLoading, setAddonsLoading] = useState(false)
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [catalogPrices, setCatalogPrices] = useState<BookingExtraPrice[]>([])
  const [catalogPricesByPet, setCatalogPricesByPet] = useState<Record<string, BookingExtraPrice[]>>({})
  const [priceCategories, setPriceCategories] = useState<BookingExtraCategory[]>([])
  const [pricesLoading, setPricesLoading] = useState(false)

  useEffect(() => {
    setWizardPets(initialPets.filter((pet) => !pet.deceased_at))
  }, [initialPets])

  const pets = wizardPets
  const [submitting, setSubmitting] = useState(false)
  const [advancingStep, setAdvancingStep] = useState(false)
  const carePlanSectionRef = useRef<PortalBookingCarePlanSectionHandle>(null)

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

  const hundepensionRange = useMemo(
    () => resolvedPetLines.some((l) => l.service_type === 'hundepension'),
    [resolvedPetLines]
  )

  const needsPickupTimes = useMemo(
    () =>
      hundepensionRange ||
      resolvedPetLines.some((l) => l.service_type === 'tagesbetreuung'),
    [resolvedPetLines, hundepensionRange]
  )

  const pickupSpan = useMemo(
    () =>
      resolvePickupDateSpan({
        petLines: resolvedPetLines.map((line) => ({
          pet_id: line.pet_id,
          service_type: line.service_type,
          day_care_mode: line.day_care_mode,
        })),
        dateRange,
        dayCareOnceDates,
        dayCareRecurring,
      }),
    [resolvedPetLines, dateRange, dayCareOnceDates, dayCareRecurring]
  )

  const holidaySet = useMemo(
    () => buildPublicHolidayDateSet(availability.publicHolidays),
    [availability.publicHolidays]
  )

  const pickupTimesFieldProps = useMemo(
    () => ({
      pickupSpan,
      publicHolidays: availability.publicHolidays,
      prices: catalogPrices,
      categories: priceCategories,
      pickupTimesNote,
    }),
    [pickupSpan, availability.publicHolidays, catalogPrices, priceCategories, pickupTimesNote]
  )

  const handleDropOffTimeChange = useCallback((value: string) => {
    setDropOffTimeTouched(true)
    setDropOffTime(value)
  }, [])

  const handlePickUpTimeChange = useCallback((value: string) => {
    setPickUpTimeTouched(true)
    setPickUpTime(value)
  }, [])

  const hasAddonStep = addonServices.length > 0

  const progressSteps = useMemo(() => {
    const steps = [
      { step: 1, label: 'Tier & Leistung' },
      { step: 2, label: 'Zeitraum' },
    ]
    if (hasAddonStep) {
      steps.push({ step: ADDON_STEP, label: 'Zusatzleistungen' })
    }
    steps.push({ step: OVERVIEW_STEP, label: 'Übersicht & Kosten' })
    return steps
  }, [hasAddonStep])

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
        publicHolidays?: PortalAvailability['publicHolidays']
        error?: string
      }>(response)

      if (error && !data?.vacationPeriods?.length) {
        console.error('Error loading availability:', error)
        return
      }

      setAvailability({
        vacationPeriods: data?.vacationPeriods || [],
        closedDates: data?.closedDates || [],
        publicHolidays: data?.publicHolidays || [],
      })
    } catch (error) {
      console.error('Error loading availability:', error)
    }
  }, [serviceTypes, today])

  const loadAddonServices = useCallback(async () => {
    setAddonsLoading(true)
    try {
      const response = await authenticatedFetch('/api/portal/addon-services')
      const data = await response.json()
      setAddonServices((data.addonServices || []) as AddonService[])
    } catch (error) {
      console.error('Error loading addon services:', error)
      setAddonServices([])
    } finally {
      setAddonsLoading(false)
    }
  }, [])

  const loadPriceCatalog = useCallback(async () => {
    if (serviceTypes.length === 0) {
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

      const activePetIds = resolvedPetLines.map((line) => line.pet_id)
      const petPriceEntries = await Promise.all(
        activePetIds.map(async (petId) => {
          const petResponse = await authenticatedFetch(`/api/prices?pet_id=${encodeURIComponent(petId)}`)
          const petData = await petResponse.json()
          return [petId, (petData.prices || []) as BookingExtraPrice[]] as const
        })
      )
      setCatalogPricesByPet(Object.fromEntries(petPriceEntries))
    } catch (error) {
      console.error('Error loading prices:', error)
    } finally {
      setPricesLoading(false)
    }
  }, [serviceTypes, resolvedPetLines])

  useEffect(() => {
    void loadAddonServices()
  }, [loadAddonServices])

  useEffect(() => {
    async function loadPortalCms() {
      try {
        const response = await authenticatedFetch('/api/cms?key=kundenportal')
        const { data, error } = await readApiResponse<{ data?: Record<string, unknown> }>(response)
        if (error) return
        const merged = mergeKundenportalData(data?.data)
        setPickupTimeDefaults(merged.pickupTimeDefaults ?? defaultPickupTimeDefaults)
        setPickupTimesNote(merged.pickupTimesNote ?? '')
      } catch (error) {
        console.error('Error loading portal CMS defaults:', error)
      }
    }
    void loadPortalCms()
  }, [])

  useEffect(() => {
    if (!needsPickupTimes) {
      setDropOffTime('')
      setPickUpTime('')
      setDropOffTimeTouched(false)
      setPickUpTimeTouched(false)
      return
    }
    if (!pickupSpan) return
    const next = resolveDefaultPickupTimesForSpan(pickupSpan, pickupTimeDefaults, holidaySet)
    if (!dropOffTimeTouched) setDropOffTime(next.dropOffTime)
    if (!pickUpTimeTouched) setPickUpTime(next.pickUpTime)
  }, [
    needsPickupTimes,
    pickupSpan,
    pickupTimeDefaults,
    holidaySet,
    dropOffTimeTouched,
    pickUpTimeTouched,
  ])

  useEffect(() => {
    if (step >= 2) {
      loadAvailability()
    }
  }, [step, loadAvailability])

  useEffect(() => {
    const needsPriceCatalog =
      step >= OVERVIEW_STEP || (step >= 2 && !hasAddonStep) || (step >= 2 && needsPickupTimes)
    if (needsPriceCatalog) {
      void loadPriceCatalog()
    }
  }, [step, hasAddonStep, needsPickupTimes, loadPriceCatalog])

  useEffect(() => {
    setSelectedAddonIds((prev) =>
      prev.filter((id) => addonServices.some((service) => service.id === id))
    )
  }, [addonServices])

  useEffect(() => {
    if (step === ADDON_STEP && !hasAddonStep) {
      setStep(OVERVIEW_STEP)
    }
  }, [step, hasAddonStep])

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

  function validateCarePlansForBooking(petsToCheck = pets): boolean {
    const petIds = resolvedPetLines.map((line) => line.pet_id)
    if (!selectedPetsHaveCompleteCarePlans(petIds, petsToCheck)) {
      toast({
        title: 'Pflegeplan fehlt',
        description: 'Bitte vervollständige den Futter- und Medikamentenplan für alle ausgewählten Tiere.',
        variant: 'destructive',
      })
      return false
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

    if (needsPickupTimes) {
      if (!dropOffTime.trim() || !pickUpTime.trim()) {
        toast({
          title: 'Fehler',
          description:
            'Bitte gib Bring- und Holzeiten für Hundepension oder Tagesbetreuung an.',
          variant: 'destructive',
        })
        return false
      }
      if (!isValidTimeHHmm(dropOffTime) || !isValidTimeHHmm(pickUpTime)) {
        toast({
          title: 'Fehler',
          description: 'Bring- und Holzeiten müssen im Format HH:MM sein.',
          variant: 'destructive',
        })
        return false
      }
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

    const addon_services = selectedAddonIds.map((addon_service_id) => ({ addon_service_id }))

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
          addon_services,
          drop_off_time: needsPickupTimes && dropOffTime ? dropOffTime : null,
          pick_up_time: needsPickupTimes && pickUpTime ? pickUpTime : null,
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

  function toggleAddon(addonId: string, checked: boolean) {
    setSelectedAddonIds((prev) => {
      if (checked) {
        if (prev.includes(addonId)) return prev
        return [...prev, addonId]
      }
      return prev.filter((id) => id !== addonId)
    })
  }

  async function goToNextStep() {
    if (step === 1) {
      if (!validateStep1()) return

      setAdvancingStep(true)
      try {
        const saveResult = await carePlanSectionRef.current?.saveIncompleteCarePlans()
        if (saveResult && !saveResult.success) {
          toast({
            title: 'Pflegeplan unvollständig',
            description: saveResult.error,
            variant: 'destructive',
          })
          return
        }

        const petsToCheck = saveResult?.pets ?? pets
        if (!validateCarePlansForBooking(petsToCheck)) return

        setStep(2)
      } finally {
        setAdvancingStep(false)
      }
      return
    }
    if (step === 2 && validateStep2()) {
      setStep(hasAddonStep ? ADDON_STEP : OVERVIEW_STEP)
      return
    }
    if (step === ADDON_STEP) {
      setStep(OVERVIEW_STEP)
    }
  }

  function goToPreviousStep() {
    if (step === OVERVIEW_STEP) {
      setStep(hasAddonStep ? ADDON_STEP : 2)
      return
    }
    if (step > 1) {
      setStep(step - 1)
    }
  }

  function formatAddonAmount(service: AddonService): string {
    return formatEuro(Number(service.amount))
  }

  return (
    <div className="flex flex-col">
      <nav aria-label="Fortschritt" className="mb-6 flex shrink-0 gap-2 overflow-x-auto pb-1">
        {progressSteps.map((s, index) => (
          <div
            key={s.step}
            className={`min-w-[4.5rem] shrink-0 flex-1 rounded-md border px-2 py-2 text-center text-xs font-medium sm:text-sm ${
              step === s.step
                ? 'border-sage-600 bg-sage-100 text-sage-900'
                : step > s.step
                  ? 'border-sage-300 bg-sage-50 text-sage-700'
                  : 'border-sage-200 text-sage-500'
            }`}
          >
            {index + 1}. <span className="hidden sm:inline">{s.label}</span><span className="sm:hidden">{s.label.split(' ')[0]}</span>
          </div>
        ))}
      </nav>

      <div className="space-y-6 pb-32 sm:pb-28">
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
                className="grid gap-3 rounded-lg border border-sage-200 bg-sage-50/50 p-3 md:grid-cols-[1fr_1fr_auto]"
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

          {resolvedPetLines.length > 0 && (
            <PortalBookingCarePlanSection
              ref={carePlanSectionRef}
              selectedPetIds={resolvedPetLines.map((line) => line.pet_id)}
              pets={pets}
              onPetsUpdated={setWizardPets}
            />
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {rangePetLines.length > 0 && (
            <div className="space-y-3">
              <Label>Zeitraum (Urlaubs- / Katzenbetreuung)</Label>
              <div
                className={
                  needsPickupTimes
                    ? 'grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,22rem)]'
                    : undefined
                }
              >
                <div className="min-w-0 space-y-3">
                  <div className="relative isolate overflow-hidden rounded-xl border border-sage-200/80 bg-white p-3">
                    <div className="flex justify-center">
                      <BookingRangeCalendar
                      selected={dateRange}
                      onSelect={handleRangeSelect}
                      disabled={isDateUnavailable}
                      vacationPeriods={availability.vacationPeriods}
                      closedDates={availability.closedDates}
                      publicHolidays={availability.publicHolidays}
                      defaultMonth={calendarDefaultMonth}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                    />
                    </div>
                  </div>
                  {dateRange?.from && (
                    <p className="text-muted-foreground text-center text-sm lg:text-left">
                      {formatDateRangeDE(dateRange.from, dateRange.to ?? dateRange.from)}
                    </p>
                  )}
                </div>
                {needsPickupTimes && (
                  <div className="w-full shrink-0 rounded-lg border border-sage-200 bg-white p-4 lg:sticky lg:top-4">
                    <PickupTimesFields
                      dropOffTime={dropOffTime}
                      pickUpTime={pickUpTime}
                      onDropOffChange={handleDropOffTimeChange}
                      onPickUpChange={handlePickUpTimeChange}
                      compact
                      {...pickupTimesFieldProps}
                    />
                  </div>
                )}
              </div>
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
                <div className="relative isolate overflow-hidden rounded-xl border border-sage-200/80 bg-white p-3">
                  <div className="flex justify-center">
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
                    publicHolidays={availability.publicHolidays}
                    defaultMonth={calendarDefaultMonth}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                  />
                  </div>
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

          {needsPickupTimes && rangePetLines.length === 0 && (
            <div className="rounded-lg border border-sage-200 bg-white p-4">
              <PickupTimesFields
                dropOffTime={dropOffTime}
                pickUpTime={pickUpTime}
                onDropOffChange={handleDropOffTimeChange}
                onPickUpChange={handlePickUpTimeChange}
                {...pickupTimesFieldProps}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-sage-600">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-3 rounded-sm border border-amber-200 bg-amber-100" />
              Betriebsferien
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-3 rounded-sm border border-sage-300 bg-sage-200" />
              Schließtag
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-3 rounded-sm border border-violet-300 bg-violet-50" />
              Feiertag (Baden-Württemberg)
            </span>
          </div>
        </div>
      )}

      {step === ADDON_STEP && hasAddonStep && (
        <div className="space-y-6">
          <p className="text-sm text-sage-600">
            Wähle optionale Zusatzleistungen für deine Anfrage. Du kannst mehrere Leistungen
            auswählen – jede Leistung höchstens einmal.
          </p>
          {addonsLoading ? (
            <p className="text-sm text-sage-600">Zusatzleistungen werden geladen…</p>
          ) : (
            <ul className="space-y-3">
              {addonServices.map((service) => {
                const checked = selectedAddonIds.includes(service.id)
                return (
                  <li
                    key={service.id}
                    className="flex flex-wrap items-start gap-3 rounded-md border border-sage-200 bg-white p-3"
                  >
                    <Checkbox
                      id={`addon-${service.id}`}
                      checked={checked}
                      onCheckedChange={(value) => toggleAddon(service.id, value === true)}
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`addon-${service.id}`}
                        className="cursor-pointer font-medium text-sage-900"
                      >
                        {service.title}
                      </label>
                      {service.description && (
                        <p className="text-sm text-sage-600">{service.description}</p>
                      )}
                      <p className="text-sm font-semibold text-sage-800">
                        {formatAddonAmount(service)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {step === OVERVIEW_STEP && (
        <PortalBookingWizardOverview
          pets={pets}
          resolvedPetLines={resolvedPetLines}
          rangePetLines={rangePetLines}
          dayCareOnceLines={dayCareOnceLines}
          dayCareRecurringLines={dayCareRecurringLines}
          dateRange={dateRange}
          dayCareOnceDates={dayCareOnceDates}
          dayCareRecurring={dayCareRecurring}
          selectedAddonIds={selectedAddonIds}
          addonServices={addonServices}
          catalogPrices={catalogPrices}
          catalogPricesByPet={catalogPricesByPet}
          priceCategories={priceCategories}
          publicHolidays={availability.publicHolidays}
          dropOffTime={dropOffTime}
          pickUpTime={pickUpTime}
          message={message}
          onMessageChange={setMessage}
          pricesLoading={pricesLoading}
        />
      )}
      </div>

      <div
        className={cn(
          'fixed bottom-0 right-0 z-40 border-t border-sage-200 bg-sage-50/95 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-sm',
          isMobile
            ? 'left-0'
            : sidebarState === 'expanded'
              ? 'left-[var(--sidebar-width)]'
              : 'left-[var(--sidebar-width-icon)]'
        )}
      >
        <div className="mx-auto flex max-w-5xl flex-col-reverse gap-2 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <Button type="button" variant="outline" onClick={step === 1 ? onCancel : goToPreviousStep} className="w-full sm:w-auto">
            {step === 1 ? 'Abbrechen' : 'Zurück'}
          </Button>
          {step < OVERVIEW_STEP ? (
            <Button
              type="button"
              onClick={() => void goToNextStep()}
              disabled={pets.length === 0}
              loading={advancingStep}
              className="w-full sm:w-auto"
            >
              {advancingStep ? 'Wird geprüft…' : 'Weiter'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={pets.length === 0}
              loading={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? 'Wird gesendet…' : 'Anfrage stellen'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
