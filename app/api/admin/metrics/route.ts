import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { count: pendingBookings, error: bookingsError } = await auth.client
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (bookingsError) {
      throw bookingsError
    }

    const { count: unseenCarePlanChanges, error: carePlanError } = await auth.client
      .from('pet_care_plan_changes')
      .select('*', { count: 'exact', head: true })
      .is('seen_at', null)

    if (carePlanError) {
      throw carePlanError
    }

    return NextResponse.json({
      pendingBookings: pendingBookings ?? 0,
      unseenCarePlanChanges: unseenCarePlanChanges ?? 0,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Interner Serverfehler'
    console.error('Error fetching admin metrics:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
