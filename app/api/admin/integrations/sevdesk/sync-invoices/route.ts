import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import { syncInvoiceDrafts } from '@/lib/invoice-sync'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { requestGroupIds?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  const requestGroupIds = Array.isArray(body.requestGroupIds)
    ? body.requestGroupIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []

  if (requestGroupIds.length === 0) {
    return NextResponse.json(
      { error: 'Mindestens eine Buchungsanfrage muss ausgewählt werden' },
      { status: 400 }
    )
  }

  try {
    const db = getAdminDbClient()
    const result = await syncInvoiceDrafts(db, requestGroupIds, auth.user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('SevDesk invoice sync failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Rechnungs-Sync fehlgeschlagen',
      },
      { status: 500 }
    )
  }
}
