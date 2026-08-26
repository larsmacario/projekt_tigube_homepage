import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { duplicateCustomerGroup } from '@/lib/group-price-list-actions'

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
    const result = await duplicateCustomerGroup(auth.client, id)

    return NextResponse.json({
      group: result.group,
      copiedRulesCount: result.copiedRulesCount,
    })
  } catch (error: unknown) {
    console.error('Error duplicating customer group:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Duplizieren der Kundengruppe'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
