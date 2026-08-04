import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const { error } = await auth.client
      .from('prices')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error archiving price:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Archivieren des Preises'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
