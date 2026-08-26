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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await auth.client
      .from('ad_formats')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return NextResponse.json({ formats: data || [] })
  } catch (error: unknown) {
    console.error('Error fetching ad formats:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Formate'
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

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const slugInput = typeof body.slug === 'string' ? body.slug.trim() : ''
    const slug = slugInput || slugify(name)
    const widthPx = Number(body.width_px)
    const heightPx = Number(body.height_px)
    const placement = body.placement === 'sidebar' ? 'sidebar' : 'sidebar'
    const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json({ error: 'Slug ist erforderlich' }, { status: 400 })
    }
    if (!Number.isFinite(widthPx) || widthPx <= 0) {
      return NextResponse.json({ error: 'Breite muss größer als 0 sein' }, { status: 400 })
    }
    if (!Number.isFinite(heightPx) || heightPx <= 0) {
      return NextResponse.json({ error: 'Höhe muss größer als 0 sein' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ad_formats')
      .insert({
        name,
        slug,
        width_px: widthPx,
        height_px: heightPx,
        placement,
        sort_order: sortOrder,
        is_active: isActive,
      })
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
    console.error('Error creating ad format:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Erstellen des Formats'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
