import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/auth'

let isRedirectingToLogin = false

async function handleUnauthorized() {
  if (isRedirectingToLogin) return
  isRedirectingToLogin = true

  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  } catch {
    // Logout-Endpoint kann fehlschlagen – trotzdem Client-Session leeren
  }

  try {
    await signOut()
  } catch {
    // Session bereits ungültig
  }

  window.location.href = '/login'
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)

  if (session?.access_token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (response.status === 401 && typeof window !== 'undefined') {
    await handleUnauthorized()
  }

  return response
}
