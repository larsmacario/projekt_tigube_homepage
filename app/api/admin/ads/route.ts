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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await auth.client
      .from('portal_ads')
      .select('*, ad_formats(*)')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return NextResponse.json({ ads: data || [] })
  } catch (error: unknown) {
    console.error('Error fetching portal ads:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Werbeanzeigen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const supabase = getWritableDbClient(auth.client)
    const body = await request.json()

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : ''
    const formatId = typeof body.format_id === 'string' ? body.format_id.trim() : ''
    const linkUrl =
      typeof body.link_url === 'string' && body.link_url.trim() ? body.link_url.trim() : null
    const linkTarget = isValidLinkTarget(body.link_target) ? body.link_target : '_blank'
    const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0
    const isActive = Boolean(body.is_active)
    const startsAt = normalizeOptionalDate(body.starts_at)
    const endsAt = normalizeOptionalDate(body.ends_at)

    if (!title) {
      return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
    }
    if (!imageUrl) {
      return NextResponse.json({ error: 'Bild-URL ist erforderlich' }, { status: 400 })
    }
    if (!formatId) {
      return NextResponse.json({ error: 'Format ist erforderlich' }, { status: 400 })
    }

    const scheduleError = validateAdSchedule(startsAt, endsAt)
    if (scheduleError) {
      return NextResponse.json({ error: scheduleError }, { status: 400 })
    }

    const formatCheck = await ensureActiveFormat(supabase, formatId)
    if (formatCheck.error) {
      return NextResponse.json({ error: formatCheck.error }, { status: formatCheck.status })
    }

    const { data, error } = await supabase
      .from('portal_ads')
      .insert({
        title,
        image_url: imageUrl,
        format_id: formatId,
        link_url: linkUrl,
        link_target: linkTarget,
        sort_order: sortOrder,
        is_active: isActive,
        starts_at: startsAt,
        ends_at: endsAt,
      })
      .select('*, ad_formats(*)')
      .single()

    if (error) throw error
    return NextResponse.json({ ad: data })
  } catch (error: unknown) {
    console.error('Error creating portal ad:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Erstellen der Werbeanzeige'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
