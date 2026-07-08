import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendContractEmail } from '@/lib/email'

function getServerClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Supabase Cookie-Namen basierend auf Projekt-URL
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default'
  const cookieName = `sb-${projectRef}-auth-token`
  
  // Hole Session aus Cookie
  const authCookie = request.cookies.get(cookieName)?.value
  let accessToken: string | undefined

  if (authCookie) {
    try {
      const sessionData = JSON.parse(decodeURIComponent(authCookie))
      accessToken = sessionData.access_token
    } catch (e) {
      accessToken = authCookie
    }
  }

  // Fallback: Versuche aus Authorization Header
  if (!accessToken) {
    const authHeader = request.headers.get('authorization')
    accessToken = authHeader?.replace('Bearer ', '')
  }

  // Fallback: Versuche aus Custom Cookie
  if (!accessToken) {
    accessToken = request.cookies.get('sb-access-token')?.value
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return { client, accessToken }
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = getServerClient(request)
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { pdfBase64, fileName } = await request.json()

    if (!pdfBase64 || !fileName) {
      return NextResponse.json({ error: 'PDF-Daten und Dateiname sind erforderlich' }, { status: 400 })
    }

    // Hole Customer-Stammdaten für E-Mail und Namen
    const { data: customer, error: customerError } = await supabase
      .from('contacts')
      .select('vorname, nachname, email')
      .eq('user_id', user.id)
      .eq('contact_type', 'customer')
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Kundenprofil nicht gefunden' }, { status: 404 })
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    const customerName = `${customer.vorname || ''} ${customer.nachname}`.trim()

    const delivery = await sendContractEmail({
      email: customer.email,
      name: customerName,
      pdfBuffer,
      fileName,
    })

    if (delivery.status === 'failed') {
      return NextResponse.json({ error: delivery.error || 'Fehler beim E-Mail-Versand' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in send-email api:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
