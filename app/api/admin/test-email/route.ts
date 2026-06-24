import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTestEmail } from '@/lib/email'

export const runtime = 'nodejs'

function getServerClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default'
  const cookieName = `sb-${projectRef}-auth-token`

  const authCookie = request.cookies.get(cookieName)?.value
  let accessToken: string | undefined

  if (authCookie) {
    try {
      const sessionData = JSON.parse(decodeURIComponent(authCookie))
      accessToken = sessionData.access_token
    } catch {
      accessToken = authCookie
    }
  }

  if (!accessToken) {
    const authHeader = request.headers.get('authorization')
    accessToken = authHeader?.replace('Bearer ', '')
  }

  if (!accessToken) {
    accessToken = request.cookies.get('sb-access-token')?.value
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return { client, accessToken }
}

async function checkAdminAuth(supabase: any, accessToken: string | undefined) {
  if (!accessToken) {
    return { error: 'Nicht autorisiert - Keine Session gefunden', status: 401 }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Nicht autorisiert', status: 401 }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Nicht autorisiert', status: 403 }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = getServerClient(request)
    const authError = await checkAdminAuth(supabase, accessToken)

    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }

    const result = await sendTestEmail()

    if (result.status === 'failed') {
      return NextResponse.json(
        {
          error: result.error,
          transport: result.transport,
          to: result.to,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      transport: result.transport,
      to: result.to,
    })
  } catch (error) {
    console.error('Test-E-Mail fehlgeschlagen:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
