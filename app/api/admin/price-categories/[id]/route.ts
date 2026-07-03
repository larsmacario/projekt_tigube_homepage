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
    const { name, description, service_type, sort_order } = await request.json()

    if (!name || !service_type) {
      return NextResponse.json({ error: 'Name und Service-Typ sind erforderlich' }, { status: 400 })
    }

    const { data: category, error } = await supabase
      .from('price_categories')
      .update({
        name,
        description,
        service_type,
        sort_order: sort_order || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ category })
  } catch (error: any) {
    console.error('Error updating price category:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren der Preiskategorie' },
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
      .from('price_categories')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting price category:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen der Preiskategorie' },
      { status: 500 }
    )
  }
}
