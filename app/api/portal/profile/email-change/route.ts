import { NextRequest, NextResponse } from 'next/server'

import { getAdminDbClient, getServerClient } from '@/lib/admin-auth'
import { updateAuthUserEmailViaAdmin } from '@/lib/customer-email'
import {
  deleteCustomerEmailChangeRequest,
  getCustomerEmailChangeRequest,
  setCustomerEmailChangeRequestStatus,
} from '@/lib/customer-email-change'
import { mapPortalApiError } from '@/lib/portal-api-errors'

async function getCurrentCustomer(request: NextRequest) {
  const { client, accessToken } = await getServerClient(request)
  if (!accessToken) return { error: 'Nicht autorisiert', status: 401 as const }

  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) return { error: 'Nicht autorisiert', status: 401 as const }

  const { data: customer, error: customerError } = await client
    .from('contacts')
    .select('id, user_id')
    .eq('user_id', user.id)
    .eq('contact_type', 'customer')
    .single()
  if (customerError || !customer) return { error: 'Kundendaten nicht gefunden', status: 404 as const }

  return { client, user, customer }
}

export async function POST(request: NextRequest) {
  try {
    const current = await getCurrentCustomer(request)
    if ('error' in current) return NextResponse.json({ error: current.error }, { status: current.status })

    const adminDb = getAdminDbClient()
    const emailChange = await getCustomerEmailChangeRequest(adminDb, current.customer.id)
    if (!emailChange || emailChange.status !== 'awaiting_customer_confirmation') {
      return NextResponse.json({ error: 'Keine bestätigbare E-Mail-Änderung vorhanden' }, { status: 400 })
    }

    const updatedChange = await setCustomerEmailChangeRequestStatus({
      db: adminDb,
      customerId: current.customer.id,
      status: 'awaiting_auth_confirmation',
    })

    try {
      await updateAuthUserEmailViaAdmin({
        db: adminDb,
        authUserId: current.user.id,
        email: emailChange.requested_email,
      })
    } catch (error) {
      await setCustomerEmailChangeRequestStatus({
        db: adminDb,
        customerId: current.customer.id,
        status: 'awaiting_customer_confirmation',
      })
      const message = error instanceof Error ? error.message : 'E-Mail-Änderung konnte nicht gestartet werden'
      return NextResponse.json({ error: mapPortalApiError(message) }, { status: 400 })
    }

    return NextResponse.json({ emailChange: updatedChange })
  } catch (error) {
    console.error('Error confirming customer email change:', error)
    const message = error instanceof Error ? error.message : 'E-Mail-Änderung konnte nicht gestartet werden'
    return NextResponse.json(
      { error: mapPortalApiError(message) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const current = await getCurrentCustomer(request)
    if ('error' in current) return NextResponse.json({ error: current.error }, { status: current.status })

    const adminDb = getAdminDbClient()
    const emailChange = await getCustomerEmailChangeRequest(adminDb, current.customer.id)
    if (!emailChange || emailChange.status !== 'awaiting_customer_confirmation') {
      return NextResponse.json({ error: 'Keine ablehnbare E-Mail-Änderung vorhanden' }, { status: 400 })
    }

    await deleteCustomerEmailChangeRequest({
      db: adminDb,
      customerId: current.customer.id,
      onlyBeforeAuthConfirmation: true,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error declining customer email change:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'E-Mail-Änderung konnte nicht abgelehnt werden' },
      { status: 500 }
    )
  }
}
