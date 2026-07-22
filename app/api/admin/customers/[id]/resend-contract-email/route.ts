import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getAdminDbClient } from '@/lib/admin-auth'
import { sendStoredContractEmail } from '@/lib/contract-email'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const customerId = params.id
    const adminDb = getAdminDbClient()

    const { data: customer, error: customerError } = await adminDb
      .from('contacts')
      .select('id, vorname, nachname, email, contract_signed')
      .eq('id', customerId)
      .eq('contact_type', 'customer')
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 })
    }

    if (!customer.contract_signed) {
      return NextResponse.json(
        { error: 'Für diesen Kunden liegt kein unterzeichneter Vertrag vor' },
        { status: 400 }
      )
    }

    const customerName = `${customer.vorname || ''} ${customer.nachname}`.trim()
    const delivery = await sendStoredContractEmail(adminDb, {
      customerId: customer.id,
      email: customer.email,
      name: customerName,
    })

    if (delivery.status === 'failed') {
      return NextResponse.json(
        { error: delivery.error || 'Fehler beim E-Mail-Versand' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      documentId: delivery.documentId,
      email: customer.email,
    })
  } catch (error: unknown) {
    console.error('Error resending contract email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Fehler' },
      { status: 500 }
    )
  }
}
