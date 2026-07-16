import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, checkAdminAuth } from '@/lib/admin-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { noteId: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)

    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { note } = await request.json()
    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return NextResponse.json({ error: 'Notiz darf nicht leer sein' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notes')
      .update({ note: note.trim() })
      .eq('id', params.noteId)
      .select('*, created_by:users(email, role)')
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Notiz nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ note: data })
  } catch (error: any) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren der Notiz' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { noteId: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)

    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { data, error } = await supabase
      .from('notes')
      .delete()
      .eq('id', params.noteId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Notiz nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen der Notiz' },
      { status: 500 }
    )
  }
}
