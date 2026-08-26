import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'

function getWritableDbClient(fallback: SupabaseClient): SupabaseClient {
  try {
    return getAdminDbClient()
  } catch {
    return fallback
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const supabase = getWritableDbClient(auth.client)
    const { id } = await params
    const body = await request.json()

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (!name) {
        return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
      }
      update.name = name
    }

    if (typeof body.slug === 'string') {
      const slug = body.slug.trim() || slugify(String(update.name || ''))
      if (!slug) {
        return NextResponse.json({ error: 'Slug ist erforderlich' }, { status: 400 })
      }
      update.slug = slug
    }

    if (body.width_px !== undefined) {
      const widthPx = Number(body.width_px)
      if (!Number.isFinite(widthPx) || widthPx <= 0) {
        return NextResponse.json({ error: 'Breite muss größer als 0 sein' }, { status: 400 })
      }
      update.width_px = widthPx
    }

    if (body.height_px !== undefined) {
      const heightPx = Number(body.height_px)
      if (!Number.isFinite(heightPx) || heightPx <= 0) {
        return NextResponse.json({ error: 'Höhe muss größer als 0 sein' }, { status: 400 })
      }
      update.height_px = heightPx
    }

    if (body.placement !== undefined) {
      update.placement = body.placement === 'sidebar' ? 'sidebar' : 'sidebar'
    }

    if (body.sort_order !== undefined) {
      update.sort_order = Number(body.sort_order) || 0
    }

    if (body.is_active !== undefined) {
      update.is_active = Boolean(body.is_active)
    }

    const { data, error } = await supabase
      .from('ad_formats')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Slug ist bereits vergeben' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ format: data })
  } catch (error: unknown) {
    console.error('Error updating ad format:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Formats'
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

    const supabase = getWritableDbClient(auth.client)
    const { id } = await params

    const { count, error: countError } = await supabase
      .from('portal_ads')
      .select('id', { count: 'exact', head: true })
      .eq('format_id', id)

    if (countError) throw countError
    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: 'Format wird noch von Werbeanzeigen verwendet und kann nicht gelöscht werden.' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('ad_formats').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting ad format:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Löschen des Formats'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
