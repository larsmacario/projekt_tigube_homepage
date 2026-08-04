import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { loadActiveAddonServices } from '@/lib/booking-addon-services-server'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const services = await loadActiveAddonServices(supabase)
    return NextResponse.json({ addonServices: services })
  } catch (error: unknown) {
    console.error('Error fetching portal addon services:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Laden der Zusatzleistungen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
