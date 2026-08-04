import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

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

    if (body.is_active !== undefined) {
      update.is_active = Boolean(body.is_active)
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

    const { data, error } = await auth.client
      .from('addon_services')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ addonService: data })
  } catch (error: unknown) {
    console.error('Error deactivating addon service:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Deaktivieren der Zusatzleistung'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
