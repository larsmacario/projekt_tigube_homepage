import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import {
  countApprovedBookingsOnDate,
  getCapacityLimit,
  isDayClosed,
  iterateIsoDateRange,
} from '@/lib/booking-availability'
import { loadAvailabilityContextForRange } from '@/lib/booking-availability-server'
import { matchRegistrationsForDate } from '@/lib/springer'
import type { SpringerOffer } from '@/lib/types'

export const runtime = 'nodejs'

const MAX_RANGE_DAYS = 14
const SERVICE_TYPE = 'tagesbetreuung' as const
const OPEN_OFFER_STATUSES = ['draft', 'sent', 'send_failed'] as const

async function checkAdminAuth(supabase: any, accessToken: string | undefined) {
  if (!accessToken) {
    return { error: 'Nicht autorisiert - Keine Session gefunden', status: 401 }
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Nicht autorisiert', status: 401 }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Nicht autorisiert', status: 403, userData: null }
  }

  return { error: null, status: 200, userData }
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

type CapacityInfo = {
  closed: boolean
  free: number | null
  service: { max: number | null; used: number; free: number | null }
  overall: { max: number | null; used: number; free: number | null }
}

type AvailabilityContext = Awaited<ReturnType<typeof loadAvailabilityContextForRange>>

function computeCapacityForDate(
  date: string,
  context: AvailabilityContext
): CapacityInfo {
  const closed = isDayClosed(
    date,
    SERVICE_TYPE,
    context.capacitySettings,
    context.capacityOverrides
  )

  const serviceMax = getCapacityLimit(
    date,
    SERVICE_TYPE,
    context.capacitySettings,
    context.capacityOverrides
  )
  const overallMax = getCapacityLimit(
    date,
    null,
    context.capacitySettings,
    context.capacityOverrides
  )
  const serviceUsed = countApprovedBookingsOnDate(date, SERVICE_TYPE, context.approvedBookings)
  const overallUsed = countApprovedBookingsOnDate(date, null, context.approvedBookings)

  const serviceFree =
    serviceMax !== null && serviceMax > 0 ? Math.max(0, serviceMax - serviceUsed) : null
  const overallFree =
    overallMax !== null && overallMax > 0 ? Math.max(0, overallMax - overallUsed) : null

  let freeCapacity: number | null = null
  if (!closed) {
    if (serviceFree !== null && overallFree !== null) {
      freeCapacity = Math.min(serviceFree, overallFree)
    } else if (serviceFree !== null) {
      freeCapacity = serviceFree
    } else if (overallFree !== null) {
      freeCapacity = overallFree
    }
  } else {
    freeCapacity = 0
  }

  return {
    closed,
    free: freeCapacity,
    service: {
      max: serviceMax,
      used: serviceUsed,
      free: serviceFree,
    },
    overall: {
      max: overallMax,
      used: overallUsed,
      free: overallFree,
    },
  }
}

function validateDateRange(from: string, to: string): string | null {
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return 'Parameter from und to müssen ISO-Datum YYYY-MM-DD sein'
  }
  if (from > to) {
    return 'from darf nicht nach to liegen'
  }
  const days = iterateIsoDateRange(from, to).length
  if (days > MAX_RANGE_DAYS) {
    return `Zeitraum darf maximal ${MAX_RANGE_DAYS} Tage umfassen`
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const date = searchParams.get('date') || ''

    if (from && to) {
      const rangeError = validateDateRange(from, to)
      if (rangeError) {
        return NextResponse.json({ error: rangeError }, { status: 400 })
      }

      const context = await loadAvailabilityContextForRange(from, to)

      const { data: registrations, error: regError } = await supabase
        .from('springer_registrations')
        .select(
          `
          *,
          pet:pets(id, name, tierart),
          customer:contacts!springer_registrations_customer_id_fkey(id, vorname, nachname, email, telefonnummer)
        `
        )
        .eq('is_active', true)

      if (regError) {
        throw regError
      }

      const { data: openOffersInRange, error: offersError } = await supabase
        .from('springer_offers')
        .select(
          `
          *,
          pet:pets(id, name, tierart),
          customer:contacts!springer_offers_customer_id_fkey(id, vorname, nachname, email)
        `
        )
        .gte('offer_date', from)
        .lte('offer_date', to)
        .in('status', [...OPEN_OFFER_STATUSES])
        .order('created_at', { ascending: false })

      if (offersError) {
        throw offersError
      }

      const offersByDate = new Map<string, SpringerOffer[]>()
      for (const offer of openOffersInRange || []) {
        const offerDate = offer.offer_date as string
        const list = offersByDate.get(offerDate) || []
        list.push(offer as SpringerOffer)
        offersByDate.set(offerDate, list)
      }

      const days = iterateIsoDateRange(from, to).map((dayDate) => {
        const openOffers = offersByDate.get(dayDate) || []
        const offeredRegistrationIds = new Set(
          openOffers.map((offer) => offer.registration_id)
        )
        const candidates = matchRegistrationsForDate(registrations || [], dayDate)

        return {
          date: dayDate,
          capacity: computeCapacityForDate(dayDate, context),
          candidates: candidates.map((candidate) => ({
            ...candidate,
            has_open_offer: offeredRegistrationIds.has(candidate.id),
          })),
          openOffers,
        }
      })

      return NextResponse.json({ from, to, days })
    }

    if (!isIsoDate(date)) {
      return NextResponse.json(
        { error: 'Parameter date=YYYY-MM-DD oder from/to sind erforderlich' },
        { status: 400 }
      )
    }

    const context = await loadAvailabilityContextForRange(date, date)
    const capacity = computeCapacityForDate(date, context)

    const { data: registrations, error: regError } = await supabase
      .from('springer_registrations')
      .select(
        `
        *,
        pet:pets(id, name, tierart),
        customer:contacts!springer_registrations_customer_id_fkey(id, vorname, nachname, email, telefonnummer)
      `
      )
      .eq('is_active', true)

    if (regError) {
      throw regError
    }

    const candidates = matchRegistrationsForDate(registrations || [], date)

    const { data: openOffers, error: offersError } = await supabase
      .from('springer_offers')
      .select(
        `
        *,
        pet:pets(id, name, tierart),
        customer:contacts!springer_offers_customer_id_fkey(id, vorname, nachname, email)
      `
      )
      .eq('offer_date', date)
      .in('status', [...OPEN_OFFER_STATUSES])
      .order('created_at', { ascending: false })

    if (offersError) {
      throw offersError
    }

    const offeredRegistrationIds = new Set(
      (openOffers || []).map((offer: { registration_id: string }) => offer.registration_id)
    )

    return NextResponse.json({
      date,
      capacity,
      candidates: candidates.map((candidate) => ({
        ...candidate,
        has_open_offer: offeredRegistrationIds.has(candidate.id),
      })),
      openOffers: openOffers || [],
    })
  } catch (error: unknown) {
    console.error('Error loading springer candidates:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Laden der Springer-Kandidaten'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
