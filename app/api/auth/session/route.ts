import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { setAuthCookies, clearAuthCookies } from '@/lib/auth-cookies'

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json()

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: 'access_token und refresh_token sind erforderlich' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })

    if (error || !data.session) {
      const response = NextResponse.json(
        { error: error?.message || 'Ungültige Session' },
        { status: 401 }
      )
      clearAuthCookies(response)
      return response
    }

    const response = NextResponse.json({ success: true })
    setAuthCookies(response, data.session)
    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Fehler beim Session-Sync'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  clearAuthCookies(response)
  return response
}
