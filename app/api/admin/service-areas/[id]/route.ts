import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

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
    const { name, description, sort_order, archived_at } = await request.json()

    const { data, error } = await auth.client
      .from('service_areas')
      .update({
        name,
        description,
        sort_order: sort_order ?? 0,
        archived_at: archived_at ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ serviceArea: data })
  } catch (error: unknown) {
    console.error('Error updating service area:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Leistungsbereichs'
    return NextResponse.json({ error: message }, { status: 500 })
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
    const { error } = await auth.client
      .from('service_areas')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error archiving service area:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Archivieren des Leistungsbereichs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
