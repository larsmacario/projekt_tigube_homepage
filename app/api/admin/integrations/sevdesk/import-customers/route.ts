import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import { importActiveSevdeskCustomers } from '@/lib/sevdesk-customer-import'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const db = getAdminDbClient()
    const summary = await importActiveSevdeskCustomers({
      db,
      initiatedBy: auth.user.id,
    })

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('SevDesk customer import failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Kundenimport fehlgeschlagen',
      },
      { status: 500 }
    )
  }
}
