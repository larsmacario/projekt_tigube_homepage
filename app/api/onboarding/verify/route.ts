import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Error parsing request body:', parseError)
      return NextResponse.json(
        { error: 'Ungültige Anfrage' },
        { status: 400 }
      )
    }

    const { token } = body || {}

    if (!token) {
      return NextResponse.json(
        { error: 'Token ist erforderlich' },
        { status: 400 }
      )
    }

    // Verwende Service Role Key für öffentlichen Zugriff auf Tokens
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json(
        { error: 'Server-Konfiguration fehlerhaft' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Hole Token-Daten (verwende limit(1) statt single() für bessere Kompatibilität)
    const { data: tokenDataArray, error: tokenError } = await supabase
      .from('onboarding_tokens')
      .select('*')
      .eq('token', token)
      .limit(1)

    if (tokenError) {
      console.error('Error fetching token:', tokenError)
      console.error('Token searched:', token)
      return NextResponse.json(
        { error: `Ungültiger Token: ${tokenError.message || 'Token nicht gefunden'}` },
        { status: 404 }
      )
    }

    if (!tokenDataArray || tokenDataArray.length === 0) {
      console.error('Token not found:', token)
      return NextResponse.json(
        { error: 'Ungültiger Token: Token nicht in der Datenbank gefunden' },
        { status: 404 }
      )
    }

    const tokenData = tokenDataArray[0]
    console.log('Token found:', tokenData.id, 'Customer ID:', tokenData.customer_id)

    // Hole Customer-Daten direkt (nicht über Relation wegen RLS)
    let customer = null
    if (tokenData.customer_id) {
      console.log('Fetching customer with ID:', tokenData.customer_id)
      const { data: customerDataArray, error: customerError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', tokenData.customer_id)
        .eq('contact_type', 'customer')
        .limit(1)

      if (customerError) {
        console.error('Error fetching customer:', customerError)
        return NextResponse.json(
          { error: `Fehler beim Laden der Kundendaten: ${customerError.message || 'Unbekannter Fehler'}` },
          { status: 404 }
        )
      }

      if (customerDataArray && customerDataArray.length > 0) {
        customer = customerDataArray[0]
      } else {
        return NextResponse.json(
          { error: 'Keine Kundendaten gefunden' },
          { status: 404 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Token hat keine zugeordnete Kunden-ID' },
        { status: 404 }
      )
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Keine Kundendaten gefunden' },
        { status: 404 }
      )
    }

    // Prüfe ob Token bereits verwendet wurde und das Onboarding bereits abgeschlossen ist
    if (tokenData.used && customer.onboarding_completed) {
      return NextResponse.json(
        { error: 'Dieses Onboarding ist bereits abgeschlossen.' },
        { status: 400 }
      )
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Dieser Onboarding-Link ist abgelaufen' }, { status: 410 })
    }

    const responseData = {
      valid: true,
      token: tokenData,
      customer: customer,
      // Für Kompatibilität mit Frontend (Onboarding zeigt lead-Preview)
      lead: {
        id: customer.id,
        nachname: customer.nachname,
        vorname: customer.vorname,
        email: customer.email,
        telefonnummer: customer.telefonnummer,
        contact_type: 'customer',
        status: customer.status,
        service: customer.service,
        message: customer.message,
        availability: customer.availability,
        datenschutz: customer.datenschutz,
        user_id: customer.user_id,
      },
    }

    console.log('Returning success response:', JSON.stringify(responseData, null, 2))
    
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  } catch (error: any) {
    console.error('Error verifying token:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    
    // Stelle sicher, dass immer eine gültige JSON-Antwort zurückgegeben wird
    try {
      return NextResponse.json(
        { 
          error: error.message || 'Fehler bei der Token-Validierung',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    } catch (jsonError) {
      // Fallback falls JSON.stringify fehlschlägt
      return new NextResponse(
        JSON.stringify({ error: 'Interner Server-Fehler' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }
  }
}
