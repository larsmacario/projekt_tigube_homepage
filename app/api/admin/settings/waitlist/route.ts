import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getPublicWaitlistConfig } from '@/lib/waitlist-settings'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const config = await getPublicWaitlistConfig(auth.client)
    const { data: settings, error } = await auth.client
      .from('site_settings')
      .select('id, waitlist_enabled, updated_at')
      .eq('id', 'site')
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      settings: settings ?? { id: 'site', waitlist_enabled: false, updated_at: null },
      texts: config.texts,
    })
  } catch (error) {
    console.error('Error fetching waitlist settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Laden der Einstellungen' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const waitlistEnabled = Boolean(body.waitlistEnabled)

    const { data, error } = await auth.client
      .from('site_settings')
      .upsert(
        {
          id: 'site',
          waitlist_enabled: waitlistEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('id, waitlist_enabled, updated_at')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error('Error updating waitlist settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Speichern der Einstellungen' },
      { status: 500 }
    )
  }
}
