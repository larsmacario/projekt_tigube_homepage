import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import {
  countApprovedBookingsOnDate,
  getCapacityLimit,
  isDayClosed,
} from '@/lib/booking-availability'
import { loadAvailabilityContextForRange } from '@/lib/booking-availability-server'
import { matchRegistrationsForDate } from '@/lib/springer'

export const runtime = 'nodejs'

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
    const date = searchParams.get('date') || ''

    if (!isIsoDate(date)) {
      return NextResponse.json(
        { error: 'Parameter date=YYYY-MM-DD ist erforderlich' },
        { status: 400 }
      )
    }

    const context = await loadAvailabilityContextForRange(date, date)
    const serviceType = 'tagesbetreuung' as const
    const closed = isDayClosed(
      date,
      serviceType,
      context.capacitySettings,
      context.capacityOverrides
    )

    const serviceMax = getCapacityLimit(
      date,
      serviceType,
      context.capacitySettings,
      context.capacityOverrides
    )
    const overallMax = getCapacityLimit(
      date,
      null,
      context.capacitySettings,
      context.capacityOverrides
    )
    const serviceUsed = countApprovedBookingsOnDate(
      date,
      serviceType,
      context.approvedBookings
    )
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
      .in('status', ['draft', 'sent', 'send_failed'])
      .order('created_at', { ascending: false })

    if (offersError) {
      throw offersError
    }

    const offeredRegistrationIds = new Set(
      (openOffers || []).map((offer: { registration_id: string }) => offer.registration_id)
    )

    return NextResponse.json({
      date,
      capacity: {
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
      },
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
