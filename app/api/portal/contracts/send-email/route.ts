import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { sendContractEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
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
