'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

async function syncSessionToCookies(accessToken: string, refreshToken: string) {
  await fetch('/api/auth/session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
    }),
  })
}

async function clearSessionCookies() {
  await fetch('/api/auth/session', {
    method: 'DELETE',
    credentials: 'include',
  })
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialer Sync beim Mount – außerhalb von onAuthStateChange, kein Deadlock-Risiko
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token && session.refresh_token) {
        void syncSessionToCookies(session.access_token, session.refresh_token)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase blockiert bei async auth-Aufrufen im Callback – immer deferren
      if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') &&
        session?.access_token &&
        session.refresh_token
      ) {
        const { access_token, refresh_token } = session
        setTimeout(() => {
          void syncSessionToCookies(access_token, refresh_token)
        }, 0)
      }

      if (event === 'SIGNED_OUT') {
        setTimeout(() => {
          void clearSessionCookies()
        }, 0)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return <>{children}</>
}
