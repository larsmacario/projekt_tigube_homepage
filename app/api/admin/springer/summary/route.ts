import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'

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

    const [{ count: openOffers, error: openError }, { count: pendingBookings, error: pendingError }] =
      await Promise.all([
        supabase
          .from('springer_offers')
          .select('id', { count: 'exact', head: true })
          .in('status', ['sent', 'draft', 'send_failed']),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('service_type', 'tagesbetreuung')
          .ilike('message', '%Springerliste%'),
      ])

    if (openError) {
      throw openError
    }
    if (pendingError) {
      throw pendingError
    }

    return NextResponse.json({
      openOffers: openOffers || 0,
      pendingBookings: pendingBookings || 0,
    })
  } catch (error: unknown) {
    console.error('Error loading springer summary:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Laden der Springer-Zusammenfassung'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
