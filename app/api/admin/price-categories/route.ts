import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { client: supabase } = auth

    const { data: categories, error } = await supabase
      .from('price_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ categories: categories || [] })
  } catch (error: any) {
    console.error('Error fetching price categories:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Preiskategorien' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { client: supabase } = auth

    const { name, description, service_type, sort_order } = await request.json()

    if (!name || !service_type) {
      return NextResponse.json({ error: 'Name und Service-Typ sind erforderlich' }, { status: 400 })
    }

    const { data: category, error } = await supabase
      .from('price_categories')
      .insert({
        name,
        description,
        service_type,
        sort_order: sort_order || 0
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ category })
  } catch (error: any) {
    console.error('Error creating price category:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen der Preiskategorie' },
      { status: 500 }
    )
  }
}
