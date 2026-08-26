import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import { clampIntervalSeconds } from '@/lib/portal-ads'

function getWritableDbClient(fallback: SupabaseClient): SupabaseClient {
  try {
    return getAdminDbClient()
  } catch {
    return fallback
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await auth.client
      .from('ad_rotation_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ settings: data })
  } catch (error: unknown) {
    console.error('Error fetching ad rotation settings:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Laden der Rotations-Einstellungen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const supabase = getWritableDbClient(auth.client)
    const body = await request.json()

    const intervalSeconds =
      body.interval_seconds !== undefined
        ? clampIntervalSeconds(Number(body.interval_seconds))
        : undefined
    const isEnabled = body.is_enabled !== undefined ? Boolean(body.is_enabled) : undefined

    const { data: existing, error: existingError } = await supabase
      .from('ad_rotation_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (existingError) throw existingError

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (intervalSeconds !== undefined) {
      update.interval_seconds = intervalSeconds
    }
    if (isEnabled !== undefined) {
      update.is_enabled = isEnabled
    }

    if (existing) {
      const { data, error } = await supabase
        .from('ad_rotation_settings')
        .update(update)
        .eq('id', existing.id)
        .select('*')
        .single()

      if (error) throw error
      return NextResponse.json({ settings: data })
    }

    const { data, error } = await supabase
      .from('ad_rotation_settings')
      .insert({
        interval_seconds: intervalSeconds ?? 8,
        is_enabled: isEnabled ?? true,
      })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ settings: data })
  } catch (error: unknown) {
    console.error('Error updating ad rotation settings:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Speichern der Rotations-Einstellungen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
