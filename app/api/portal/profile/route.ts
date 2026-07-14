import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
    if (!accessToken) {
      console.error('No access token found')
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }
    
    // Prüfe ob User eingeloggt ist
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    // Hole User-Daten aus public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData) {
      console.error('User data error:', userError)
      return NextResponse.json(
        { error: 'User-Daten nicht gefunden' },
        { status: 401 }
      )
    }

    console.log('Loading profile for user:', { id: userData.id, email: userData.email })

    // Versuche zuerst über user_id zu finden
    let { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userData.id)
      .eq('contact_type', 'customer')
      .single()

    console.log('Query by user_id result:', { data: data?.id, error: error?.code, errorMessage: error?.message })

    // Wenn nicht gefunden, versuche über Email zu finden (für Onboarding-Fall)
    if ((error && error.code === 'PGRST116') || !data) {
      console.log('Customer nicht über user_id gefunden, versuche über Email:', authUser.email)
      const { data: emailData, error: emailError } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', authUser.email)
        .eq('contact_type', 'customer')
        .single()

      console.log('Query by email result:', { data: emailData?.id, error: emailError?.code, errorMessage: emailError?.message })

      if (!emailError && emailData) {
        data = emailData
        error = null
        console.log('Customer über Email gefunden:', emailData.id, 'user_id:', emailData.user_id)
      }
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching customer:', error)
      throw error
    }

    if (data) {
      console.log('Customer data loaded:', {
        id: data.id,
        nachname: data.nachname,
        vorname: data.vorname,
        email: data.email,
        user_id: data.user_id,
        status: data.status
      })
    } else {
      console.warn('No customer data found')
    }

    return NextResponse.json({ customer: data || null })
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden des Profils' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }
    
    // Prüfe ob User eingeloggt ist
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    // Hole User-Daten aus public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User-Daten nicht gefunden' },
        { status: 401 }
      )
    }

    const updates = await request.json()

    // Prüfe ob Customer bereits existiert
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userData.id)
      .eq('contact_type', 'customer')
      .single()

    let result
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('user_id', userData.id)
        .eq('contact_type', 'customer')
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          user_id: userData.id,
          email: authUser.email,
          contact_type: 'customer',
          status: 'active',
          service: 'portal',
          message: '',
          availability: '-',
          nachname: '',
          vorname: '',
          telefonnummer: '',
          datenschutz: false,
          onboarding_completed: false,
          ...updates,
          contact_type: 'customer',
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({ customer: result })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren des Profils' },
      { status: 500 }
    )
  }
}


