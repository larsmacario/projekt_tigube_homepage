import { NextResponse } from 'next/server'
import type { Session } from '@supabase/supabase-js'

const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30 // 30 Tage

export function getSupabaseProjectRef(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return 'default'
  return supabaseUrl.split('//')[1]?.split('.')[0] || 'default'
}

function getLegacySupabaseAuthCookieNames(): string[] {
  const projectRef = getSupabaseProjectRef()
  const base = `sb-${projectRef}-auth-token`
  return [
    base,
    `${base}.0`,
    `${base}.1`,
    `${base}.2`,
    `${base}.3`,
    `${base}.4`,
  ]
}

const AUTH_COOKIE_NAMES = ['sb-access-token', 'sb-refresh-token'] as const

function deleteCookie(response: NextResponse, name: string) {
  response.cookies.delete({ name, path: '/' })
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of AUTH_COOKIE_NAMES) {
    deleteCookie(response, name)
  }
  for (const name of getLegacySupabaseAuthCookieNames()) {
    deleteCookie(response, name)
  }
}

export function setAuthCookies(response: NextResponse, session: Session) {
  // Alte/duplizierte Supabase-Cookies entfernen, bevor neue gesetzt werden (verhindert HTTP 431).
  clearAuthCookies(response)

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
