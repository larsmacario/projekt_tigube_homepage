import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import { coerceAddonServiceFlags } from '@/lib/booking-addon-services'
import { loadAllAddonServices } from '@/lib/booking-addon-services-server'
import { ensureSevdeskArticleLink } from '@/lib/sevdesk-article-sync'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const services = await loadAllAddonServices(auth.client)
    return NextResponse.json({ addonServices: services })
  } catch (error: unknown) {
    console.error('Error fetching addon services:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Laden der Zusatzleistungen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null
    const amount = Number(body.amount)
    const sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0
    const flags = coerceAddonServiceFlags({
      is_active: body.is_active,
      is_billable: body.is_billable !== undefined ? body.is_billable : true,
    })
    if (flags.error) {
      return NextResponse.json({ error: flags.error }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'Betrag muss 0 oder größer sein' }, { status: 400 })
    }

    const { data, error } = await auth.client
      .from('addon_services')
      .insert({
        title,
        description,
        amount,
        sort_order,
        is_active: flags.is_active,
        is_billable: flags.is_billable,
      })
      .select('*')
      .single()

    if (error) throw error

    const adminDb = getAdminDbClient()
    await ensureSevdeskArticleLink(adminDb, {
      table: 'addon_services',
      row: data as {
        id: string
        title: string
        description: string | null
        amount: number
        sevdesk_article_id: string | null
        sevdesk_part_number: string | null
        sevdesk_sync_status: 'none' | 'pending' | 'synced' | 'failed' | null
      },
    })

    const { data: refreshed } = await adminDb
      .from('addon_services')
      .select('*')
      .eq('id', data.id)
      .single()

    return NextResponse.json({ addonService: refreshed ?? data })
  } catch (error: unknown) {
    console.error('Error creating addon service:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Erstellen der Zusatzleistung'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
