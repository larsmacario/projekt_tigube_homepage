import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

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

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })
    }

    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Ungültiger Anfrage-Body' }, { status: 400 })
    }

    if (body.status !== 'closed') {
      return NextResponse.json(
        { error: 'Nur status: "closed" wird unterstützt' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('springer_offers')
      .update({
        status: 'closed',
        closed_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .in('status', ['draft', 'sent', 'send_failed'])
      .select(
        `
        *,
        pet:pets(id, name, tierart),
        customer:contacts!springer_offers_customer_id_fkey(id, vorname, nachname, email)
      `
      )
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Angebot nicht gefunden oder bereits abgeschlossen' },
        { status: 404 }
      )
    }

    return NextResponse.json({ offer: data })
  } catch (error: unknown) {
    console.error('Error closing springer offer:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Schließen des Angebots'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
