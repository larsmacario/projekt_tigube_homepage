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
    async function syncInitialSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token && session.refresh_token) {
        await syncSessionToCookies(session.access_token, session.refresh_token)
      }
    }

    syncInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
          session?.access_token &&
          session.refresh_token
        ) {
          await syncSessionToCookies(session.access_token, session.refresh_token)
        }

        if (event === 'SIGNED_OUT') {
          await clearSessionCookies()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return <>{children}</>
}
