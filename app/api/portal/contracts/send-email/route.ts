import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getAdminDbClient } from '@/lib/admin-auth'
import { sendStoredContractEmail } from '@/lib/contract-email'

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const documentId = typeof body.documentId === 'string' ? body.documentId : undefined

    const { data: customer, error: customerError } = await supabase
      .from('contacts')
      .select('id, vorname, nachname, email')
      .eq('user_id', user.id)
      .eq('contact_type', 'customer')
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Kundenprofil nicht gefunden' }, { status: 404 })
    }

    const customerName = `${customer.vorname || ''} ${customer.nachname}`.trim()
    const adminDb = getAdminDbClient()

    const delivery = await sendStoredContractEmail(adminDb, {
      customerId: customer.id,
      email: customer.email,
      name: customerName,
      documentId,
    })

    if (delivery.status === 'failed') {
      return NextResponse.json({ error: delivery.error || 'Fehler beim E-Mail-Versand' }, { status: 500 })
    }

    return NextResponse.json({ success: true, documentId: delivery.documentId })
  } catch (error: unknown) {
    console.error('Error in send-email api:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Fehler' },
      { status: 500 }
    )
  }
}
