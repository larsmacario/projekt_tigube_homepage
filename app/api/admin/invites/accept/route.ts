import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminDbClient } from '@/lib/admin-auth'
import { setAuthCookies } from '@/lib/auth-cookies'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { email, password, token } = await request.json()

    if (!email || !password || !token) {
      return NextResponse.json(
        { error: 'E-Mail, Passwort und Einladungs-Token sind erforderlich' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Das Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      )
    }

    const cleanEmail = email.toLowerCase().trim()
    const supabaseAdmin = getAdminDbClient()

    // 1. Einladung abfragen und prüfen
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('admin_invitations')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Der Einladungslink ist ungültig oder wurde bereits verwendet' },
        { status: 400 }
      )
    }

    if (invite.email !== cleanEmail) {
      return NextResponse.json(
        { error: 'Die angegebene E-Mail-Adresse stimmt nicht mit der Einladung überein' },
        { status: 400 }
      )
    }

    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Der Einladungslink ist abgelaufen' },
        { status: 400 }
      )
    }

    // 2. User in Supabase Auth anlegen
    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
    })

    if (createUserError || !authData.user) {
      return NextResponse.json(
        { error: createUserError?.message || 'Registrierung fehlgeschlagen' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // 3. User-Rolle in public.users auf admin aktualisieren
    // Der public.users-Eintrag wurde wahrscheinlich automatisch per Trigger angelegt,
    // aber standardmäßig erhält er eventuell die Rolle 'customer'.
    // Wir setzen sie explizit auf 'admin'.
    const { error: roleError } = await supabaseAdmin
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userId)

    if (roleError) {
      // Rollback: User aus Auth löschen bei Fehler
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw roleError
    }

    // 4. Einladung als verwendet markieren
    const { error: updateInviteError } = await supabaseAdmin
      .from('admin_invitations')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', invite.id)

    if (updateInviteError) {
      console.error('Fehler beim Markieren der Einladung als verwendet:', updateInviteError)
    }

    // 5. Automatisch anmelden, um Session-Cookies zu generieren
    const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({
      email: cleanEmail,
      password
    })

    if (signInError || !signInData.session) {
      return NextResponse.json(
        { error: 'Konto erstellt. Bitte melde dich mit deinen Zugangsdaten an.' },
        { status: 400 }
      )
    }

    const response = NextResponse.json({ success: true, session: signInData.session })

    setAuthCookies(response, signInData.session)

    return response
  } catch (error: any) {
    console.error('Error accepting admin invite:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Registrieren' },
      { status: 500 }
    )
  }
}
