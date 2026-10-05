import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/admin-auth'
import { getPortalAvailabilitySnapshotForServices } from '@/lib/booking-availability-server'
import { getBookingHorizonEndIso, isAfterBookingHorizon } from '@/lib/booking-horizon'
import { toIsoDate } from '@/lib/vacation-dates'
import type { ServiceType } from '@/lib/types'

const SERVICE_TYPES: ServiceType[] = ['hundepension', 'katzenbetreuung', 'tagesbetreuung']

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')

    const today = toIsoDate(new Date())
    const horizonEnd = getBookingHorizonEndIso()
    const rangeStart = fromDate || today
    const rangeEnd = toDate || horizonEnd

    if (rangeEnd < rangeStart) {
      return NextResponse.json({ error: 'Ungültiger Datumsbereich' }, { status: 400 })
    }

    if (isAfterBookingHorizon(rangeEnd)) {
      return NextResponse.json(
        { error: `Verfügbarkeit nur bis ${horizonEnd} abrufbar.` },
        { status: 400 }
      )
    }

    const availability = await getPortalAvailabilitySnapshotForServices(
      rangeStart,
      rangeEnd,
      SERVICE_TYPES
    )

    return NextResponse.json(availability)
  } catch (error: unknown) {
    console.error('Admin calendar availability error:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden'
    const status = message.includes('Nicht autorisiert') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
