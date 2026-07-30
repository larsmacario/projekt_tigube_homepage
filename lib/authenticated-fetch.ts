import { supabase } from '@/lib/supabase'

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const executeFetch = async (accessToken?: string): Promise<Response> => {
    const headers = new Headers(init.headers)

    if (accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }

    return fetch(input, {
      ...init,
      // Ein Bearer-Token genügt für die Admin-APIs. Zusätzliche Auth-Cookies
      // würden denselben JWT mehrfach übertragen und können HTTP 431 auslösen.
      credentials: accessToken ? 'omit' : 'include',
      headers,
    })
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  let accessToken = session?.access_token
  let response = await executeFetch(accessToken)

  if (response.status === 401 && !init.signal?.aborted) {
    const {
      data: { session: refreshedSession },
      error,
    } = await supabase.auth.refreshSession()

    if (!error && refreshedSession?.access_token) {
      accessToken = refreshedSession.access_token
      response = await executeFetch(accessToken)
    }
  }

  return response
}
