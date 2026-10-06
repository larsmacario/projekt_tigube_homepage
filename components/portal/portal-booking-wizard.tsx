'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type DateRange } from 'react-day-picker'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useSidebar } from '@/components/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookingDaysAndTimes } from '@/components/portal/booking-days-and-times'
import {
  BOOKING_APPOINTMENT_PLAN_VERSION,
  buildDayCarePlanSection,
  buildVacationBlockPlans,
  expandRecurringDayCareBookableDates,
} from '@/lib/booking-appointment-plan'
import { getBookingHorizonEndDate, getBookingHorizonEndIso } from '@/lib/booking-horizon'
import {
  buildRecurringConfigFromSchedule,
  dayCareModeFromSchedule,
  type DayCareScheduleUI,
} from '@/lib/portal-day-care-schedule'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { mergeKundenportalData } from '@/lib/cms/portal-defaults'
import { buildPublicHolidayDateSet } from '@/lib/public-holidays-de'
import {
  defaultPickupTimeDefaults,
  resolveDefaultPickupTimesForSpan,
} from '@/lib/pickup-time-defaults'
import { resolvePickupDateSpan } from '@/lib/pickup-date-span'
import { readApiResponse } from '@/lib/read-api-response'
import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'
import { getServicesForPetType } from '@/lib/booking-service'
import { isDateInVacationPeriods, iterateIsoDateRange } from '@/lib/booking-availability'
import { fetchPortalAvailabilitySnapshot } from '@/lib/portal-availability-client'
import { VatPriceDisplay } from '@/components/vat-price-display'
import { cn } from '@/lib/utils'
import { isRangeService } from '@/lib/day-care-booking'
import type { DayCareMode } from '@/lib/types'
import { startOfDay, toIsoDate, parseIsoDate } from '@/lib/vacation-dates'
import type { BookingRequest, AddonService, Pet, ServiceType } from '@/lib/types'
import { PortalBookingWizardOverview } from '@/components/portal/portal-booking-wizard-overview'
import {
  PortalBookingCarePlanSection,
  selectedPetsHaveCompleteCarePlans,
  type PortalBookingCarePlanSectionHandle,
} from '@/components/portal/portal-booking-care-plan-section'
import {
  buildPortalBookingDateBlocksPayload,
  buildPortalBookingEnvelope,
  buildPortalBookingPetsPayload,
  type PortalBookingStep2DateBlockUI,
  validatePortalBookingStep2,
} from '@/lib/portal-booking-step2-validation'
import type { KundenportalPickupRow } from '@/lib/cms/portal-defaults'

const OVERVIEW_STEP = 4
const ADDON_STEP = 3

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
  const [dateBlocks, setDateBlocks] = useState<PortalBookingStep2DateBlockUI[]>([{}])
  const [dayCareOnceDates, setDayCareOnceDates] = useState<Record<string, Date[]>>({})
  const [dayCareRecurring, setDayCareRecurring] = useState<
    Record<
      string,
      {
        weekdays: number[]
        startDate?: Date
        endDate?: Date
        unbefristet?: boolean
        intervalWeeks?: 1 | 2
      }
    >
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
  const [pickupTimesList, setPickupTimesList] = useState<KundenportalPickupRow[]>([])
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
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null)
  const carePlanSectionRef = useRef<PortalBookingCarePlanSectionHandle>(null)
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
    }
  }, [])

  const today = useMemo(() => startOfDay(new Date()), [])
  const horizonEnd = useMemo(() => getBookingHorizonEndDate(today), [today])
  const [dayCareScheduleByPet, setDayCareScheduleByPet] = useState<
    Record<string, DayCareScheduleUI>
  >({})

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

  const rangeDateRange = useMemo((): DateRange | undefined => {
    const envelope = buildPortalBookingEnvelope({
      petLines: resolvedPetLines,
      petNames: {},
      dateBlocks,
      dayCareOnceDates,
      dayCareRecurring,
      dropOffTime: '',
      pickUpTime: '',
      availability: { closedDates: [], vacationPeriods: [] },
    })
    if (!envelope) return undefined
    const from = parseIsoDate(envelope.start_date)
    const to = parseIsoDate(envelope.end_date)
    return {
      from: from ?? undefined,
      to: to ?? undefined,
    }
  }, [resolvedPetLines, dateBlocks, dayCareOnceDates, dayCareRecurring])

  const pickupSpan = useMemo(
    () =>
      resolvePickupDateSpan({
        petLines: resolvedPetLines.map((line) => ({
          pet_id: line.pet_id,
          service_type: line.service_type,
          day_care_mode: line.day_care_mode,
        })),
        dateRange: rangeDateRange,
        dayCareOnceDates,
        dayCareRecurring,
      }),
    [resolvedPetLines, rangeDateRange, dayCareOnceDates, dayCareRecurring]
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
      pickupTimesList,
    }),
    [
      pickupSpan,
      availability.publicHolidays,
      catalogPrices,
      priceCategories,
      pickupTimesNote,
      pickupTimesList,
    ]
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

  const dayCareLines = useMemo(
    () => resolvedPetLines.filter((l) => l.service_type === 'tagesbetreuung'),
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

  const skippedPreviewByPet = useMemo(() => {
    const out: Record<string, number> = {}
    for (const line of dayCareLines) {
      const schedule = dayCareScheduleByPet[line.pet_id] ?? {
        repeat: 'none' as const,
        unbefristet: true,
      }
      if (schedule.repeat === 'none') continue
      const cfg = buildRecurringConfigFromSchedule(
        dayCareOnceDates[line.pet_id] || [],
        schedule
      )
      if (!cfg?.startDate || !cfg.weekdays.length) continue
      const startIso = toIsoDate(startOfDay(cfg.startDate))
      const endIso =
        cfg.unbefristet !== false && !cfg.endDate
          ? null
          : cfg.endDate
            ? toIsoDate(startOfDay(cfg.endDate))
            : null
      const { skipped } = expandRecurringDayCareBookableDates({
        startDate: startIso,
        endDate: endIso,
        weekdays: cfg.weekdays,
        intervalWeeks: cfg.intervalWeeks === 2 ? 2 : 1,
        availability,
      })
      out[line.pet_id] = skipped.length
    }
    return out
  }, [dayCareLines, dayCareScheduleByPet, dayCareOnceDates, availability])

  useEffect(() => {
    setPetLines((prev) => {
      let changed = false
      const next = prev.map((line) => {
        if (line.service_type !== 'tagesbetreuung') {
          if (!line.day_care_mode) return line
          changed = true
          return { ...line, day_care_mode: '' as const }
        }
        const schedule = dayCareScheduleByPet[line.pet_id] ?? {
          repeat: 'none' as const,
          unbefristet: true,
        }
        const mode = dayCareModeFromSchedule(schedule.repeat)
        if (line.day_care_mode === mode) return line
        changed = true
        return { ...line, day_care_mode: mode as PetServiceLine['day_care_mode'] }
      })
      return changed ? next : prev
    })

    setDayCareRecurring((prev) => {
      const next = { ...prev }
      let changed = false

      for (const line of resolvedPetLines.filter((l) => l.service_type === 'tagesbetreuung')) {
        const schedule = dayCareScheduleByPet[line.pet_id] ?? {
          repeat: 'none' as const,
          unbefristet: true,
        }
        const dates = dayCareOnceDates[line.pet_id] || []
        if (schedule.repeat === 'none') {
          if (line.pet_id in next) {
            delete next[line.pet_id]
            changed = true
          }
          continue
        }
        const cfg = buildRecurringConfigFromSchedule(dates, schedule)
        if (!cfg) continue
        const entry = {
          weekdays: cfg.weekdays,
          startDate: cfg.startDate,
          endDate: cfg.endDate,
          unbefristet: cfg.unbefristet,
          intervalWeeks: cfg.intervalWeeks,
        }
        const existing = prev[line.pet_id]
        const same =
          existing &&
          existing.weekdays.length === entry.weekdays.length &&
          existing.weekdays.every((d, i) => d === entry.weekdays[i]) &&
          existing.startDate?.getTime() === entry.startDate?.getTime() &&
          existing.endDate?.getTime() === entry.endDate?.getTime() &&
          existing.unbefristet === entry.unbefristet &&
          existing.intervalWeeks === entry.intervalWeeks
        if (same) continue
        next[line.pet_id] = entry
        changed = true
      }
      return changed ? next : prev
    })
  }, [resolvedPetLines, dayCareScheduleByPet, dayCareOnceDates])

  const showRangeBlocksUi = rangePetLines.length > 0

  const loadAvailability = useCallback(async () => {
    try {
      const todayIso = toIsoDate(today)
      const rangeEnd = getBookingHorizonEndIso(today)
      const snapshot = await fetchPortalAvailabilitySnapshot({
        fromDate: todayIso,
        toDate: rangeEnd,
        serviceTypes,
      })
      setAvailability(snapshot)
    } catch (error) {
      console.error('Error loading availability:', error)
    }
  }, [serviceTypes, today])

  const loadAddonServices = useCallback(async () => {
    setAddonsLoading(true)
    try {
      const response = await authenticatedFetch('/api/portal/addon-services')
      const { data } = await readApiResponse<{ addonServices?: AddonService[] }>(response)
      setAddonServices(data?.addonServices ?? [])
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
      const { data } = await readApiResponse<{
        categories?: BookingExtraCategory[]
        prices?: BookingExtraPrice[]
      }>(response)
      const categories = data?.categories ?? []
      const prices = data?.prices ?? []
      setPriceCategories(categories)
      setCatalogPrices(prices)

      const activePetIds = resolvedPetLines.map((line) => line.pet_id)
      const petPriceEntries = await Promise.all(
        activePetIds.map(async (petId) => {
          const petResponse = await authenticatedFetch(
            `/api/prices?pet_id=${encodeURIComponent(petId)}`
          )
          const { data: petData } = await readApiResponse<{ prices?: BookingExtraPrice[] }>(
            petResponse
          )
          return [petId, petData?.prices ?? []] as const
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
        setPickupTimesList(merged.pickupTimesList ?? [])
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
    void loadAvailability()
  }, [loadAvailability])

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
    const firstBlockFrom = dateBlocks.find((b) => b.from)?.from
    if (firstBlockFrom) return firstBlockFrom
    if (rangeDateRange?.from) return rangeDateRange.from
    const todayIso = toIsoDate(today)
    const upcomingVacation = availability.vacationPeriods.find(
      (period) => period.end_date >= todayIso
    )
    if (upcomingVacation) {
      return parseIsoDate(upcomingVacation.start_date) ?? today
    }
    return today
  }, [availability.vacationPeriods, dateBlocks, rangeDateRange?.from, today])

  useEffect(() => {
    if (step !== 2) return
    setCalendarMonth(calendarDefaultMonth)
  }, [step, calendarDefaultMonth])

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
        if (patch.service_type === 'tagesbetreuung' && patch.pet_id) {
          setDayCareScheduleByPet((sched) => ({
            ...sched,
            [patch.pet_id!]: sched[patch.pet_id!] ?? { repeat: 'none', unbefristet: true },
          }))
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

  function focusValidationSection(sectionId: string) {
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
    setHighlightedSectionId(sectionId)
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    highlightTimeoutRef.current = setTimeout(() => setHighlightedSectionId(null), 3000)
  }

  function validateStep2(): boolean {
    const petNames = Object.fromEntries(pets.map((pet) => [pet.id, pet.name]))
    const error = validatePortalBookingStep2({
      petLines: resolvedPetLines,
      petNames,
      dateBlocks,
      dayCareOnceDates,
      dayCareRecurring,
      dropOffTime,
      pickUpTime,
      availability,
    })

    if (error) {
      if (error.sectionId) focusValidationSection(error.sectionId)
      toast({
        title: 'Fehler',
        description: error.description,
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  function handleBlockRangeSelect(blockIndex: number, range: DateRange | undefined) {
    if (!range?.from) {
      setDateBlocks((prev) =>
        prev.map((block, i) => (i === blockIndex ? { ...block, from: undefined, to: undefined } : block))
      )
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
        setDateBlocks((prev) =>
          prev.map((block, i) =>
            i === blockIndex ? { ...block, from, to: undefined } : block
          )
        )
        return
      }
    }

    setDateBlocks((prev) =>
      prev.map((block, i) => (i === blockIndex ? { ...block, from, to } : block))
    )
  }

  function addDateBlock() {
    setDateBlocks((prev) => [...prev, {}])
  }

  function removeDateBlock(index: number) {
    setDateBlocks((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  async function handleSubmit() {
    if (!validateStep2()) return

    const envelope = buildPortalBookingEnvelope({
      petLines: resolvedPetLines,
      petNames: {},
      dateBlocks,
      dayCareOnceDates,
      dayCareRecurring,
      dropOffTime: '',
      pickUpTime: '',
      availability: { closedDates: [], vacationPeriods: [] },
    })
    const dateBlocksPayload = buildPortalBookingDateBlocksPayload({
      petLines: resolvedPetLines,
      petNames: {},
      dateBlocks,
      dayCareOnceDates,
      dayCareRecurring,
      dropOffTime: '',
      pickUpTime: '',
      availability: { closedDates: [], vacationPeriods: [] },
    })

    const addon_services = selectedAddonIds.map((addon_service_id) => ({ addon_service_id }))

    const petsPayload = buildPortalBookingPetsPayload(
      resolvedPetLines,
      dayCareOnceDates,
      dayCareRecurring,
      availability
    )

    const dateBlocksIso = buildPortalBookingDateBlocksPayload({
      petLines: resolvedPetLines,
      petNames: {},
      dateBlocks,
      dayCareOnceDates,
      dayCareRecurring,
      dropOffTime,
      pickUpTime,
      availability,
    })

    const skippedSerieDates: string[] = []
    for (const line of dayCareLines) {
      const count = skippedPreviewByPet[line.pet_id] ?? 0
      if (count <= 0) continue
      const schedule = dayCareScheduleByPet[line.pet_id]
      if (!schedule || schedule.repeat === 'none') continue
      const cfg = buildRecurringConfigFromSchedule(
        dayCareOnceDates[line.pet_id] || [],
        schedule
      )
      if (!cfg?.startDate || !cfg.weekdays.length) continue
      const startIso = toIsoDate(startOfDay(cfg.startDate))
      const endIso =
        cfg.unbefristet !== false && !cfg.endDate
          ? null
          : cfg.endDate
            ? toIsoDate(startOfDay(cfg.endDate))
            : null
      skippedSerieDates.push(
        ...expandRecurringDayCareBookableDates({
          startDate: startIso,
          endDate: endIso,
          weekdays: cfg.weekdays,
          intervalWeeks: cfg.intervalWeeks === 2 ? 2 : 1,
          availability,
        }).skipped
      )
    }

    const appointmentPlan =
      needsPickupTimes || dateBlocksIso.length > 0
        ? {
            version: BOOKING_APPOINTMENT_PLAN_VERSION,
            ...(dateBlocksIso.length > 0 && dropOffTime && pickUpTime
              ? {
                  vacation_blocks: buildVacationBlockPlans(
                    dateBlocksIso,
                    dropOffTime,
                    pickUpTime
                  ),
                }
              : {}),
            ...(dayCareLines.length > 0 && dropOffTime && pickUpTime
              ? {
                  day_care: buildDayCarePlanSection({
                    defaultDropOff: dropOffTime,
                    defaultPickUp: pickUpTime,
                    skippedDates: [...new Set(skippedSerieDates)].sort(),
                  }),
                }
              : {}),
          }
        : null

    setSubmitting(true)
    try {
      const response = await authenticatedFetch('/api/portal/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: envelope?.start_date ?? null,
          end_date: envelope?.end_date ?? null,
          date_blocks: dateBlocksPayload.length > 0 ? dateBlocksPayload : undefined,
          message: message || null,
          pets: petsPayload,
          addon_services,
          drop_off_time: needsPickupTimes && dropOffTime ? dropOffTime : null,
          pick_up_time: needsPickupTimes && pickUpTime ? pickUpTime : null,
          appointment_plan: appointmentPlan,
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

  function formatAddonAmount(service: AddonService) {
    return <VatPriceDisplay net={Number(service.amount)} />
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
        <BookingDaysAndTimes
          pets={pets}
          resolvedPetLines={resolvedPetLines}
          rangePetLines={rangePetLines}
          dayCareLines={dayCareLines}
          dateBlocks={dateBlocks}
          dayCareOnceDates={dayCareOnceDates}
          dayCareScheduleByPet={dayCareScheduleByPet}
          skippedPreviewByPet={skippedPreviewByPet}
          showRangeBlocksUi={showRangeBlocksUi}
          needsPickupTimes={needsPickupTimes}
          hundepensionRange={hundepensionRange}
          dropOffTime={dropOffTime}
          pickUpTime={pickUpTime}
          onDropOffChange={handleDropOffTimeChange}
          onPickUpChange={handlePickUpTimeChange}
          pickupTimesNote={pickupTimesNote}
          pickupTimesList={pickupTimesList}
          catalogPrices={catalogPrices}
          priceCategories={priceCategories}
          availability={availability}
          calendarDefaultMonth={calendarDefaultMonth}
          calendarMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
          horizonEnd={horizonEnd}
          isDateUnavailable={isDateUnavailable}
          highlightedSectionId={highlightedSectionId}
          onBlockRangeSelect={handleBlockRangeSelect}
          onAddDateBlock={addDateBlock}
          onRemoveDateBlock={removeDateBlock}
          onDayCareDatesSelect={(petId, dates) =>
            setDayCareOnceDates((prev) => ({ ...prev, [petId]: dates || [] }))
          }
          onDayCareScheduleChange={(petId, patch) =>
            setDayCareScheduleByPet((prev) => ({
              ...prev,
              [petId]: {
                ...(prev[petId] ?? { repeat: 'none', unbefristet: true }),
                ...patch,
              },
            }))
          }
          pickupSpan={pickupSpan}
          dayCareRecurring={dayCareRecurring}
        />
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
                      <div className="text-sm">
                        {formatAddonAmount(service)}
                      </div>
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
          dateBlocks={dateBlocks}
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
