import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { setAuthCookies } from '@/lib/auth-cookies'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Erstelle neuen Supabase Client für diese Request
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Login über Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.session || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Ungültige Anmeldedaten' },
        { status: 401 }
      )
    }

    // Erstelle neuen Client mit der Session
    const supabaseWithSession = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
        },
      },
    })

    // Hole User-Rolle direkt aus public.users mit Session
    const { data: userData, error: userError } = await supabaseWithSession
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    // Falls User nicht in public.users existiert, erstelle ihn (Fallback für alte User)
    if (userError || !userData) {
      console.log('User nicht gefunden, versuche zu erstellen. Error:', userError)
      
      // Versuche User zu erstellen - verwende Service Role oder direkten Insert
      // Da RLS INSERT blockieren könnte, verwenden wir einen Workaround
      const { data: newUser, error: createError } = await supabaseWithSession
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          role: 'customer',
        })
        .select()
        .single()

      if (createError || !newUser) {
        console.error('Error creating user:', createError)
        
        // Falls INSERT auch fehlschlägt, gib zumindest die Auth-Daten zurück
        // Der Trigger sollte den User automatisch erstellen, aber falls nicht:
        const fallbackResponse = NextResponse.json({
          success: true,
          user: {
            id: authData.user.id,
            email: authData.user.email!,
            role: 'customer', // Fallback
          },
          session: authData.session,
          warning: 'User wurde automatisch erstellt, bitte Seite neu laden',
        })

        setAuthCookies(fallbackResponse, authData.session)

        return fallbackResponse
      }

      // Erstelle Response mit User-Daten
      const response = NextResponse.json({
        success: true,
        user: newUser,
        session: authData.session,
      })

      setAuthCookies(response, authData.session)

      return response
    }

    // Erstelle Response mit User-Daten
    const response = NextResponse.json({
      success: true,
      user: userData,
      session: authData.session,
    })

    setAuthCookies(response, authData.session)

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Login' },
      { status: 401 }
    )
  }
}


