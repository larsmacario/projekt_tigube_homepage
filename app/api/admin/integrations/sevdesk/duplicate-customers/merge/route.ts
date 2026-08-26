import { NextRequest, NextResponse } from 'next/server'

import { getAdminDbClient, requireAdmin } from '@/lib/admin-auth'
import { CustomerMergeError, mergeCustomers } from '@/lib/customer-merge'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let payload: { targetCustomerId?: string; sourceCustomerId?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Payload' }, { status: 400 })
  }

  const { targetCustomerId, sourceCustomerId } = payload
  if (!targetCustomerId || !sourceCustomerId) {
    return NextResponse.json(
      { error: 'Ziel- und Quell-Kunden-ID sind erforderlich' },
      { status: 400 }
    )
  }

  if (targetCustomerId === sourceCustomerId) {
    return NextResponse.json(
      { error: 'Ein Kunde kann nicht mit sich selbst zusammengeführt werden' },
      { status: 400 }
    )
  }

  try {
    const result = await mergeCustomers({
      db: getAdminDbClient(),
      targetCustomerId,
      sourceCustomerId,
      adminUserId: auth.user.id,
      adminEmail: auth.user.email || 'Admin',
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error merging customers:', error)
    return NextResponse.json(
      {
        error:
          error instanceof CustomerMergeError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Kunden konnten nicht zusammengeführt werden',
      },
      { status: error instanceof CustomerMergeError ? 400 : 500 }
    )
  }
}
