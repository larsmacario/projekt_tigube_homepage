import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { client: supabase } = auth

    const { data: groups, error } = await supabase
      .from('customer_groups')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ groups: groups || [] })
  } catch (error: any) {
    console.error('Error fetching customer groups:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Kundengruppen' },
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

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    const { data: group, error } = await supabase
      .from('customer_groups')
      .insert({ name, description })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ group })
  } catch (error: any) {
    console.error('Error creating customer group:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen der Kundengruppe' },
      { status: 500 }
    )
  }
}
