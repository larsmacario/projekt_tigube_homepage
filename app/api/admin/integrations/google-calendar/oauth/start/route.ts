import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  GOOGLE_CALENDAR_OAUTH_STATE_COOKIE,
  buildGoogleAuthorizationUrl,
  createGoogleOAuthState,
  getGoogleCalendarRedirectUri,
  getGoogleCalendarSettings,
} from '@/lib/google-calendar'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const settings = await getGoogleCalendarSettings()
    if (!settings?.oauth_configured || !settings.client_id) {
      return NextResponse.json(
        { error: 'Bitte zuerst OAuth Client-ID und Geheimnis speichern' },
        { status: 400 }
      )
    }

    const state = createGoogleOAuthState(auth.user.id)
    const redirectUri = getGoogleCalendarRedirectUri()
    const authorizationUrl = buildGoogleAuthorizationUrl(settings.client_id, state, redirectUri)

    const response = NextResponse.redirect(authorizationUrl)
    response.cookies.set(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })

    return response
  } catch (error) {
    console.error('Google Calendar OAuth start failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Google-Anmeldung konnte nicht gestartet werden',
      },
      { status: 500 }
    )
  }
}
