import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { count, error } = await auth.client
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) {
      throw error
    }

    return NextResponse.json({ pendingBookings: count ?? 0 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Interner Serverfehler'
    console.error('Error fetching admin metrics:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
