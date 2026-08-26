import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { resetGroupToStandard } from '@/lib/group-price-list-actions'

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
    await resetGroupToStandard(auth.client, id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error resetting group to standard:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Zurücksetzen auf Standardpreise'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
