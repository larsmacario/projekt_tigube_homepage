import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await auth.client
      .from('service_areas')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return NextResponse.json({ serviceAreas: data ?? [] })
  } catch (error: unknown) {
    console.error('Error fetching service areas:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Leistungsbereiche'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { slug, name, description, sort_order } = await request.json()
    if (!slug?.trim() || !name?.trim()) {
      return NextResponse.json(
        { error: 'slug und name sind erforderlich' },
        { status: 400 }
      )
    }

    const { data, error } = await auth.client
      .from('service_areas')
      .insert({
        slug: String(slug).trim().toLowerCase(),
        name: String(name).trim(),
        description: description ?? null,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ serviceArea: data })
  } catch (error: unknown) {
    console.error('Error creating service area:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Erstellen des Leistungsbereichs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
