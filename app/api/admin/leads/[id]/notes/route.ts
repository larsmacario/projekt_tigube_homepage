import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'

async function checkAdminAuth(supabase: any, accessToken: string | undefined) {
  if (!accessToken) {
    return { error: 'Nicht autorisiert - Keine Session gefunden', status: 401 }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Nicht autorisiert', status: 401 }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Nicht autorisiert', status: 403 }
  }

  return { user }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const contactId = params.id

    const { data, error } = await supabase
      .from('notes')
      .select('*, created_by:users(email, role)')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ notes: data || [] })
  } catch (error: any) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Notizen' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const contactId = params.id
    const { note } = await request.json()

    if (!note || note.trim().length === 0) {
      return NextResponse.json(
        { error: 'Notiz darf nicht leer sein' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        contact_id: contactId,
        note: note.trim(),
        created_by: authResult.user.id,
      })
      .select('*, created_by:users(email, role)')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ note: data })
  } catch (error: any) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen der Notiz' },
      { status: 500 }
    )
  }
}


