import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { coerceAddonServiceFlags } from '@/lib/booking-addon-services'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const body = await request.json()

    const { data: existing, error: existingError } = await auth.client
      .from('addon_services')
      .select('id, archived_at')
      .eq('id', id)
      .maybeSingle()

    if (existingError) throw existingError
    if (!existing) {
      return NextResponse.json({ error: 'Zusatzleistung nicht gefunden' }, { status: 404 })
    }

    if (existing.archived_at) {
      return NextResponse.json(
        { error: 'Archivierte Zusatzleistungen können nicht bearbeitet werden' },
        { status: 400 }
      )
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.title === 'string') {
      const title = body.title.trim()
      if (!title) {
        return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
      }
      update.title = title
    }

    if (body.description !== undefined) {
      update.description =
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim()
          : null
    }

    if (body.amount !== undefined) {
      const amount = Number(body.amount)
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({ error: 'Betrag muss 0 oder größer sein' }, { status: 400 })
      }
      update.amount = amount
    }

    if (body.sort_order !== undefined) {
      update.sort_order = Number(body.sort_order) || 0
    }

    if (body.is_active !== undefined || body.is_billable !== undefined) {
      const { data: currentFlags } = await auth.client
        .from('addon_services')
        .select('is_active, is_billable')
        .eq('id', id)
        .single()

      const flags = coerceAddonServiceFlags({
        is_active:
          body.is_active !== undefined ? Boolean(body.is_active) : Boolean(currentFlags?.is_active),
        is_billable:
          body.is_billable !== undefined
            ? Boolean(body.is_billable)
            : Boolean(currentFlags?.is_billable),
      })
      if (flags.error) {
        return NextResponse.json({ error: flags.error }, { status: 400 })
      }
      update.is_active = flags.is_active
      update.is_billable = flags.is_billable
    }

    const { data, error } = await auth.client
      .from('addon_services')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ addonService: data })
  } catch (error: unknown) {
    console.error('Error updating addon service:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Zusatzleistung'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const body = await request.json()

    if (body.action !== 'restore') {
      return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await auth.client
      .from('addon_services')
      .select('id, archived_at')
      .eq('id', id)
      .maybeSingle()

    if (existingError) throw existingError
    if (!existing) {
      return NextResponse.json({ error: 'Zusatzleistung nicht gefunden' }, { status: 404 })
    }

    if (!existing.archived_at) {
      return NextResponse.json({ error: 'Zusatzleistung ist nicht archiviert' }, { status: 400 })
    }

    const { data, error } = await auth.client
      .from('addon_services')
      .update({
        archived_at: null,
        is_active: false,
        is_billable: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ addonService: data })
  } catch (error: unknown) {
    console.error('Error restoring addon service:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Wiederherstellen der Zusatzleistung'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params

    const { data: existing, error: existingError } = await auth.client
      .from('addon_services')
      .select('id, archived_at')
      .eq('id', id)
      .maybeSingle()

    if (existingError) throw existingError
    if (!existing) {
      return NextResponse.json({ error: 'Zusatzleistung nicht gefunden' }, { status: 404 })
    }

    if (existing.archived_at) {
      return NextResponse.json({ error: 'Zusatzleistung ist bereits archiviert' }, { status: 400 })
    }

    const { data, error } = await auth.client
      .from('addon_services')
      .update({
        archived_at: new Date().toISOString(),
        is_active: false,
        is_billable: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ addonService: data })
  } catch (error: unknown) {
    console.error('Error archiving addon service:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Archivieren der Zusatzleistung'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
