import { NextRequest, NextResponse } from 'next/server'

import { getAdminDbClient, getServerClient } from '@/lib/admin-auth'
import {
  ACCOUNT_DELETION_CONFIRMATION,
  CustomerDeletionError,
  deleteOrAnonymizeCustomerAccount,
  getCustomerDeletionPreview,
} from '@/lib/customer-deletion'
import { getPortalCustomer } from '@/lib/portal-customer'
import { mapPortalApiError } from '@/lib/portal-api-errors'

export async function GET(request: NextRequest) {
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

    const portalCustomer = await getPortalCustomer(supabase, user.id)
    if ('error' in portalCustomer) {
      return NextResponse.json({ error: portalCustomer.error }, { status: portalCustomer.status })
    }

    const preview = await getCustomerDeletionPreview(getAdminDbClient(), portalCustomer.customer.id)
    return NextResponse.json({ preview })
  } catch (error: unknown) {
    console.error('Error loading account deletion preview:', error)
    const message =
      error instanceof CustomerDeletionError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Fehler beim Laden der Lösch-Vorschau'
    return NextResponse.json({ error: mapPortalApiError(message) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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
    if (body.confirmation !== ACCOUNT_DELETION_CONFIRMATION) {
      return NextResponse.json(
        { error: `Bitte gib zur Bestätigung exakt „${ACCOUNT_DELETION_CONFIRMATION}" ein.` },
        { status: 400 }
      )
    }

    const portalCustomer = await getPortalCustomer(supabase, user.id)
    if ('error' in portalCustomer) {
      return NextResponse.json({ error: portalCustomer.error }, { status: portalCustomer.status })
    }

    const result = await deleteOrAnonymizeCustomerAccount({
      db: getAdminDbClient(),
      customerId: portalCustomer.customer.id,
      performedBy: 'customer',
    })

    return NextResponse.json({ success: true, result })
  } catch (error: unknown) {
    console.error('Error deleting customer account:', error)
    const message =
      error instanceof CustomerDeletionError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Fehler beim Löschen des Kontos'
    return NextResponse.json({ error: mapPortalApiError(message) }, { status: 500 })
  }
}
