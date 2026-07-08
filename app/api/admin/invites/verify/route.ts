import { NextRequest, NextResponse } from 'next/server'
import { getAdminDbClient } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token ist erforderlich' }, { status: 400 })
    }

    const supabaseAdmin = getAdminDbClient()

    const { data: invite, error } = await supabaseAdmin
      .from('admin_invitations')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .maybeSingle()

    if (error) throw error

    if (!invite) {
      return NextResponse.json({ error: 'Einladung nicht gefunden oder bereits verwendet' }, { status: 404 })
    }

    // Prüfen, ob das Token abgelaufen ist
    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Der Einladungslink ist abgelaufen' }, { status: 400 })
    }

    return NextResponse.json({ success: true, invite })
  } catch (error: any) {
    console.error('Error verifying admin invite token:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler bei der Token-Überprüfung' },
      { status: 500 }
    )
  }
}
