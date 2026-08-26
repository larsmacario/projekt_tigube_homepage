import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import {
  isValidLinkTarget,
  normalizeOptionalDate,
  validateAdSchedule,
} from '@/lib/portal-ads'

function getWritableDbClient(fallback: SupabaseClient): SupabaseClient {
  try {
    return getAdminDbClient()
  } catch {
    return fallback
  }
}

async function ensureActiveFormat(
  supabase: SupabaseClient,
  formatId: string
): Promise<{ error?: string; status?: number }> {
  const { data, error } = await supabase
    .from('ad_formats')
    .select('id, is_active')
    .eq('id', formatId)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    return { error: 'Format nicht gefunden', status: 400 }
  }
  if (!data.is_active) {
    return { error: 'Das gewählte Format ist nicht aktiv', status: 400 }
  }
  return {}
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

    if (typeof body.title === 'string') {
      const title = body.title.trim()
      if (!title) {
        return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
      }
      update.title = title
    }

    if (typeof body.image_url === 'string') {
      const imageUrl = body.image_url.trim()
      if (!imageUrl) {
        return NextResponse.json({ error: 'Bild-URL ist erforderlich' }, { status: 400 })
      }
      update.image_url = imageUrl
    }

    if (typeof body.format_id === 'string') {
      const formatId = body.format_id.trim()
      if (!formatId) {
        return NextResponse.json({ error: 'Format ist erforderlich' }, { status: 400 })
      }
      const formatCheck = await ensureActiveFormat(supabase, formatId)
      if (formatCheck.error) {
        return NextResponse.json({ error: formatCheck.error }, { status: formatCheck.status })
      }
      update.format_id = formatId
    }

    if (body.link_url !== undefined) {
      update.link_url =
        typeof body.link_url === 'string' && body.link_url.trim() ? body.link_url.trim() : null
    }

    if (body.link_target !== undefined) {
      if (!isValidLinkTarget(body.link_target)) {
        return NextResponse.json({ error: 'Ungültiges Link-Ziel' }, { status: 400 })
      }
      update.link_target = body.link_target
    }

    if (body.sort_order !== undefined) {
      update.sort_order = Number(body.sort_order) || 0
    }

    if (body.is_active !== undefined) {
      update.is_active = Boolean(body.is_active)
    }

    if (body.starts_at !== undefined) {
      update.starts_at = normalizeOptionalDate(body.starts_at)
    }

    if (body.ends_at !== undefined) {
      update.ends_at = normalizeOptionalDate(body.ends_at)
    }

    const startsAt =
      update.starts_at !== undefined
        ? (update.starts_at as string | null)
        : undefined
    const endsAt =
      update.ends_at !== undefined ? (update.ends_at as string | null) : undefined

    if (startsAt !== undefined || endsAt !== undefined) {
      const { data: existing, error: existingError } = await supabase
        .from('portal_ads')
        .select('starts_at, ends_at')
        .eq('id', id)
        .single()

      if (existingError) throw existingError

      const scheduleError = validateAdSchedule(
        startsAt !== undefined ? startsAt : existing.starts_at,
        endsAt !== undefined ? endsAt : existing.ends_at
      )
      if (scheduleError) {
        return NextResponse.json({ error: scheduleError }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('portal_ads')
      .update(update)
      .eq('id', id)
      .select('*, ad_formats(*)')
      .single()

    if (error) throw error
    return NextResponse.json({ ad: data })
  } catch (error: unknown) {
    console.error('Error updating portal ad:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Werbeanzeige'
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

    const { error } = await supabase.from('portal_ads').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting portal ad:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Löschen der Werbeanzeige'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
