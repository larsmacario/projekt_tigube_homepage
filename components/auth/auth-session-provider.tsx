'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

let syncInFlight: Promise<void> | null = null
let lastSyncedTokenKey: string | null = null

function getTokenKey(accessToken: string, refreshToken: string): string {
  return `${accessToken}:${refreshToken}`
}

async function syncSessionToCookies(accessToken: string, refreshToken: string) {
  const tokenKey = getTokenKey(accessToken, refreshToken)
  if (lastSyncedTokenKey === tokenKey) return

  if (syncInFlight) {
    await syncInFlight.catch(() => undefined)
    if (lastSyncedTokenKey === tokenKey) return
  }

  syncInFlight = (async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
        }),
      })

      if (!response.ok) {
        console.warn('[auth] Session-Cookie-Sync fehlgeschlagen:', response.status)
        return
      }

      lastSyncedTokenKey = tokenKey
    } catch (error) {
      // Netzwerkfehler z. B. bei Dev-Server-Neustart, Strict Mode oder Tab-Wechsel
      console.debug('[auth] Session-Cookie-Sync nicht möglich:', error)
    } finally {
      syncInFlight = null
    }
  })()

  await syncInFlight
}

async function clearSessionCookies() {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      console.warn('[auth] Session-Cookies konnten nicht gelöscht werden:', response.status)
      return
    }

    lastSyncedTokenKey = null
  } catch (error) {
    console.debug('[auth] Session-Cookies löschen nicht möglich:', error)
  }
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    // Initialer Sync beim Mount – außerhalb von onAuthStateChange, kein Deadlock-Risiko
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return
      if (session?.access_token && session.refresh_token) {
        void syncSessionToCookies(session.access_token, session.refresh_token)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase blockiert bei async auth-Aufrufen im Callback – immer deferren
      if (
        (event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION' ||
          event === 'USER_UPDATED') &&
        session?.access_token &&
        session.refresh_token
      ) {
        const { access_token, refresh_token } = session
        setTimeout(() => {
          if (!mountedRef.current) return
          void syncSessionToCookies(access_token, refresh_token)
        }, 0)
      }

      if (event === 'SIGNED_OUT') {
        setTimeout(() => {
          if (!mountedRef.current) return
          void clearSessionCookies()
        }, 0)
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
}
