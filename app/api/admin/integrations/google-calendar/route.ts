import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  clearGoogleCalendarConnection,
  getGoogleCalendarRedirectUri,
  getGoogleCalendarSettings,
  setGoogleOAuthCredentials,
  updateGoogleCalendarSettings,
} from '@/lib/google-calendar'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const settings = await getGoogleCalendarSettings()
    return NextResponse.json({
      settings,
      redirectUri: getGoogleCalendarRedirectUri(),
    })
  } catch (error) {
    console.error('Google Calendar settings GET failed:', error)
    return NextResponse.json(
      { error: 'Google-Kalender-Einstellungen konnten nicht geladen werden' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { clientId?: string; clientSecret?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
  const clientSecret = typeof body.clientSecret === 'string' ? body.clientSecret.trim() : ''

  if (clientId.length < 10 || clientSecret.length < 10) {
    return NextResponse.json(
      { error: 'Bitte gültige OAuth Client-ID und Client-Geheimnis eingeben' },
      { status: 400 }
    )
  }

  try {
    await setGoogleOAuthCredentials(clientId, clientSecret, auth.user.id)
    const settings = await getGoogleCalendarSettings()
    return NextResponse.json({ settings, redirectUri: getGoogleCalendarRedirectUri() })
  } catch (error) {
    console.error('Google Calendar OAuth credentials POST failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'OAuth-Daten konnten nicht gespeichert werden',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: {
    calendarId?: string
    calendarSummary?: string
    blockingEnabled?: boolean
    timezone?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  const patch: Parameters<typeof updateGoogleCalendarSettings>[0] = {}

  if (typeof body.calendarId === 'string') {
    patch.calendar_id = body.calendarId.trim() || null
  }
  if (typeof body.calendarSummary === 'string') {
    patch.calendar_summary = body.calendarSummary.trim() || null
  }
  if (typeof body.blockingEnabled === 'boolean') {
    patch.blocking_enabled = body.blockingEnabled
  }
  if (typeof body.timezone === 'string' && body.timezone.trim()) {
    patch.timezone = body.timezone.trim()
  }

  try {
    const settings = await updateGoogleCalendarSettings(patch)
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Google Calendar settings PATCH failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Einstellungen konnten nicht gespeichert werden',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    await clearGoogleCalendarConnection()
    const settings = await getGoogleCalendarSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Google Calendar DELETE failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Google-Verbindung konnte nicht getrennt werden',
      },
      { status: 500 }
    )
  }
}
