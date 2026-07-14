import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { setAuthCookies } from '@/lib/auth-cookies'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { email, password, token } = await request.json()

    if (!email || !password || !token) {
      return NextResponse.json(
        { error: 'E-Mail, Passwort und Onboarding-Link sind erforderlich' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      )
    }

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server-Konfiguration fehlerhaft' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('onboarding_tokens')
      .select('id, customer_id, expires_at')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (tokenError || !tokenData?.customer_id || (tokenData.expires_at && new Date(tokenData.expires_at).getTime() <= Date.now())) {
      return NextResponse.json({ error: 'Der Onboarding-Link ist ungültig oder abgelaufen' }, { status: 400 })
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('contacts')
      .select('id, email, user_id')
      .eq('id', tokenData.customer_id)
      .eq('contact_type', 'customer')
      .eq('email', email)
      .single()

    if (customerError || !customer || customer.user_id) {
      return NextResponse.json({ error: 'Dieser Onboarding-Link kann nicht mehr verwendet werden' }, { status: 400 })
    }

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createUserError || !createdUser.user) {
      return NextResponse.json({ error: createUserError?.message || 'Registrierung fehlgeschlagen' }, { status: 400 })
    }

    const { error: linkError } = await supabaseAdmin
      .from('contacts')
      .update({ user_id: createdUser.user.id, status: 'active', onboarding_completed: false })
      .eq('id', customer.id)
      .is('user_id', null)

    if (linkError) {
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      throw linkError
    }

    const { error: consumeError } = await supabaseAdmin
      .from('onboarding_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', tokenData.id)
      .eq('used', false)

    if (consumeError) throw consumeError

    const publicClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({ email, password })
    if (signInError || !signInData.session) {
      return NextResponse.json({ error: 'Konto erstellt. Bitte melde dich mit deinen Zugangsdaten an.' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true, session: signInData.session })

    setAuthCookies(response, signInData.session)

    return response
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler bei der Registrierung' },
      { status: 400 }
    )
  }
}
