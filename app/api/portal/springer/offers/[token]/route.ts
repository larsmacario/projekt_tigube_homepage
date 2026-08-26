import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { getPortalCustomer } from '@/lib/portal-customer'
import { isOfferAcceptable } from '@/lib/springer'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ token: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    if (!token) {
      return NextResponse.json({ error: 'Token fehlt' }, { status: 400 })
    }

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

    const customerResult = await getPortalCustomer(supabase, authUser.id)
    if ('error' in customerResult) {
      return NextResponse.json(
        { error: customerResult.error },
        { status: customerResult.status }
      )
    }

    const { data: offer, error } = await supabase
      .from('springer_offers')
      .select(
        `
        *,
        pet:pets(id, name, tierart),
        customer:contacts!springer_offers_customer_id_fkey(id, vorname, nachname, email)
      `
      )
      .eq('token', token)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!offer) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })
    }

    if (offer.customer_id !== customerResult.customer.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    if (offer.status === 'closed') {
      return NextResponse.json(
        { error: 'Dieses Angebot ist bereits geschlossen' },
        { status: 410 }
      )
    }

    if (!isOfferAcceptable(offer) && offer.status !== 'responded') {
      return NextResponse.json(
        { error: 'Dieses Angebot ist nicht mehr verfügbar' },
        { status: 410 }
      )
    }

    return NextResponse.json({ offer })
  } catch (error: unknown) {
    console.error('Error fetching springer offer:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Laden des Angebots'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
