import { NextResponse } from 'next/server'
import type { Session } from '@supabase/supabase-js'

const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30 // 30 Tage

export function setAuthCookies(response: NextResponse, session: Session) {
  response.cookies.set('sb-access-token', session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: session.expires_in || 3600,
    path: '/',
  })

  response.cookies.set('sb-refresh-token', session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/',
  })
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')
}
