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

    const { data: unseenCarePlanRows, error: carePlanError } = await auth.client
      .from('pet_care_plan_changes')
      .select('pet_id')
      .is('seen_at', null)

    if (carePlanError) {
      throw carePlanError
    }

    const unseenCarePlanChanges = new Set(
      (unseenCarePlanRows ?? []).map((row) => row.pet_id)
    ).size

    return NextResponse.json({
      pendingBookings: pendingBookings ?? 0,
      unseenCarePlanChanges,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Interner Serverfehler'
    console.error('Error fetching admin metrics:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
