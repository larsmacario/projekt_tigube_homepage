import { NextRequest, NextResponse } from 'next/server'
import {
  GOOGLE_CALENDAR_OAUTH_STATE_COOKIE,
  exchangeGoogleAuthorizationCode,
  getGoogleCalendarRedirectUri,
  setGoogleRefreshToken,
  verifyGoogleOAuthState,
} from '@/lib/google-calendar'

export const runtime = 'nodejs'

function settingsRedirect(request: NextRequest, query: Record<string, string>): NextResponse {
  const base = new URL('/admin/einstellungen', request.url)
  for (const [key, value] of Object.entries(query)) {
    base.searchParams.set(key, value)
  }
  const response = NextResponse.redirect(base)
  response.cookies.set(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const errorParam = url.searchParams.get('error')
  if (errorParam) {
    return settingsRedirect(request, {
      google_calendar: 'error',
      google_calendar_message: errorParam,
    })
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = request.cookies.get(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE)?.value

  if (!code || !state || !cookieState || state !== cookieState) {
    return settingsRedirect(request, {
      google_calendar: 'error',
      google_calendar_message: 'Ungültiger OAuth-Status',
    })
  }

  const verified = verifyGoogleOAuthState(state)
  if (!verified) {
    return settingsRedirect(request, {
      google_calendar: 'error',
      google_calendar_message: 'OAuth-Sitzung abgelaufen',
    })
  }

  try {
    const redirectUri = getGoogleCalendarRedirectUri()
    const tokens = await exchangeGoogleAuthorizationCode(code, redirectUri)

    if (!tokens.refreshToken) {
      return settingsRedirect(request, {
        google_calendar: 'error',
        google_calendar_message:
          'Kein Refresh Token erhalten. Bitte Verbindung trennen und erneut mit „Zustimmung“ verbinden.',
      })
    }

    await setGoogleRefreshToken(tokens.refreshToken, verified.adminUserId)

    return settingsRedirect(request, { google_calendar: 'connected' })
  } catch (error) {
    console.error('Google Calendar OAuth callback failed:', error)
    const message =
      error instanceof Error ? error.message : 'Google-Verbindung fehlgeschlagen'
    return settingsRedirect(request, {
      google_calendar: 'error',
      google_calendar_message: message,
    })
  }
}
