import { NextRequest } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type ServerClientResult = {
  client: SupabaseClient
  accessToken: string | undefined
  refreshToken: string | undefined
}

function createAuthClient(accessToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function parseAccessTokenFromCookie(request: NextRequest): string | undefined {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default'
  const cookieName = `sb-${projectRef}-auth-token`

  const authCookie = request.cookies.get(cookieName)?.value
  if (authCookie) {
    try {
      const sessionData = JSON.parse(decodeURIComponent(authCookie))
      return sessionData.access_token
    } catch {
      return authCookie
    }
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '')
  }

  return request.cookies.get('sb-access-token')?.value
}

async function refreshAccessToken(refreshToken: string) {
  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

  if (error || !data.session) {
    return null
  }

  return data.session
}

export async function getServerClient(request: NextRequest): Promise<ServerClientResult> {
  let accessToken = parseAccessTokenFromCookie(request)
  const refreshToken = request.cookies.get('sb-refresh-token')?.value

  if (accessToken) {
    const client = createAuthClient(accessToken)
    const { data: { user }, error } = await client.auth.getUser()

    if (!error && user) {
      return { client, accessToken, refreshToken }
    }
  }

  if (refreshToken) {
    const session = await refreshAccessToken(refreshToken)
    if (session) {
      accessToken = session.access_token
      const client = createAuthClient(accessToken)
      return {
        client,
        accessToken,
        refreshToken: session.refresh_token,
      }
    }
  }

  return {
    client: createAuthClient(accessToken),
    accessToken,
    refreshToken,
  }
}

export function getAdminDbClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Die Server-Konfiguration für die Datenbankverwaltung fehlt')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function checkAdminAuth(supabase: SupabaseClient, accessToken: string | undefined) {
  if (!accessToken) {
    return { error: 'Nicht autorisiert - Keine Session gefunden', status: 401 as const }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Nicht autorisiert', status: 401 as const }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Nicht autorisiert', status: 403 as const }
  }

  return { user }
}

export async function requireAdmin(request: NextRequest) {
  const { client, accessToken } = await getServerClient(request)
  const auth = await checkAdminAuth(client, accessToken)
  if ('error' in auth) {
    return { error: auth.error, status: auth.status }
  }
  return { client, user: auth.user, accessToken }
}
