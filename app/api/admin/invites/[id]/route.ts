import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'

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
    const supabaseAdmin = getAdminDbClient()

    const { error } = await supabaseAdmin
      .from('admin_invitations')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting admin invite:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen der Einladung' },
      { status: 500 }
    )
  }
}
