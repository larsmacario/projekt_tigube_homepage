import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { getPortalAvailabilitySnapshot, getPortalAvailabilitySnapshotForServices } from '@/lib/booking-availability-server'
import { toIsoDate } from '@/lib/vacation-dates'
import type { ServiceType } from '@/lib/types'

const SERVICE_TYPES: ServiceType[] = ['hundepension', 'katzenbetreuung', 'tagesbetreuung']

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const serviceTypeParam = searchParams.get('service_type')
    const serviceTypesParam = searchParams.get('service_types')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')

    let serviceType: ServiceType | null = null
    let serviceTypes: ServiceType[] = []

    if (serviceTypesParam) {
      const parsed = serviceTypesParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const value of parsed) {
        if (!SERVICE_TYPES.includes(value as ServiceType)) {
          return NextResponse.json({ error: 'Ungültiger Service-Typ' }, { status: 400 })
        }
        serviceTypes.push(value as ServiceType)
      }
      serviceTypes = [...new Set(serviceTypes)]
    } else if (serviceTypeParam) {
      if (!SERVICE_TYPES.includes(serviceTypeParam as ServiceType)) {
        return NextResponse.json({ error: 'Ungültiger Service-Typ' }, { status: 400 })
      }
      serviceType = serviceTypeParam as ServiceType
    }

    const today = toIsoDate(new Date())
    const defaultEnd = new Date()
    defaultEnd.setFullYear(defaultEnd.getFullYear() + 1)

    const rangeStart = fromDate || today
    const rangeEnd = toDate || toIsoDate(defaultEnd)

    if (rangeEnd < rangeStart) {
      return NextResponse.json({ error: 'Ungültiger Datumsbereich' }, { status: 400 })
    }

    const availability =
      serviceTypes.length > 0
        ? await getPortalAvailabilitySnapshotForServices(
            rangeStart,
            rangeEnd,
            serviceTypes
          )
        : await getPortalAvailabilitySnapshot(
            rangeStart,
            rangeEnd,
            serviceType,
            supabase
          )

    return NextResponse.json(availability)
  } catch (error: any) {
    console.error('Error fetching booking availability:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Verfügbarkeit' },
      { status: 500 }
    )
  }
}
