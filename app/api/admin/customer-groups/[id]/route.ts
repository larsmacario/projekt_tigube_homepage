import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { client: supabase } = auth
    const { id } = params
    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    const { data: group, error } = await supabase
      .from('customer_groups')
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ group })
  } catch (error: any) {
    console.error('Error updating customer group:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren der Kundengruppe' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { client: supabase } = auth
    const { id } = params

    const { error } = await supabase
      .from('customer_groups')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting customer group:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen der Kundengruppe' },
      { status: 500 }
    )
  }
}
