import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import { listInvoiceSyncCandidates } from '@/lib/invoice-sync'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const db = getAdminDbClient()
    const month = request.nextUrl.searchParams.get('month')
    const candidates = await listInvoiceSyncCandidates(db, { month })
    const ready = candidates.filter((candidate) => candidate.blockers.length === 0)

    return NextResponse.json({
      candidates,
      readyCount: ready.length,
    })
  } catch (error) {
    console.error('SevDesk invoice candidates failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Rechnungskandidaten konnten nicht geladen werden',
      },
      { status: 500 }
    )
  }
}
