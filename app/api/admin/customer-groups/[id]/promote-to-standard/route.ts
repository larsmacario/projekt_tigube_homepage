import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { promoteGroupToStandard } from '@/lib/group-price-list-actions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const result = await promoteGroupToStandard(auth.client, id)

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      archivedCount: result.archivedCount,
    })
  } catch (error: unknown) {
    console.error('Error promoting group to standard catalog:', error)
    const message =
      error instanceof Error
        ? error.message
        : 'Fehler beim Übernehmen als Standard-Preisliste'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
