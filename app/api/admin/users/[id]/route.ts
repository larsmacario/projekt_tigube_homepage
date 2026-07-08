import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const body = await request.json()
    const { vorname, nachname } = body

    if (!vorname || !nachname) {
      return NextResponse.json(
        { error: 'Vorname und Nachname sind Pflichtfelder' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getAdminDbClient()

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update({
        vorname: vorname.trim(),
        nachname: nachname.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error('Error updating admin user:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren des Admins' },
      { status: 500 }
    )
  }
}

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
    const loggedInUser = auth.user

    // Sich selbst löschen verhindern
    if (id === loggedInUser.id) {
      return NextResponse.json(
        { error: 'Sie können Ihr eigenes Administratorkonto nicht selbst löschen' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getAdminDbClient()

    // 1. Zuerst aus der Tabelle public.users löschen
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id)

    if (dbError) throw dbError

    // 2. Dann aus Supabase Auth löschen
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (authError) {
      console.error('Error deleting user from Supabase Auth:', authError)
      // Wir loggen den Fehler, brechen aber nicht ab, da der User in public.users bereits weg ist.
      // Manchmal schlägt das fehl, wenn der User in Auth gar nicht existiert.
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting admin user:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen des Admins' },
      { status: 500 }
    )
  }
}
