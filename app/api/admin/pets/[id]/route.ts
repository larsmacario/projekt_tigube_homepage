import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { PET_EDITABLE_FIELDS, pickAllowedFields } from '@/lib/contact-editable-fields'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const updates = pickAllowedFields(await request.json(), PET_EDITABLE_FIELDS)
    if (updates.name && typeof updates.name === 'string') {
      updates.name = updates.name.trim()
    }

    const { data, error } = await auth.client
      .from('pets')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Tier nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ pet: data })
  } catch (error: any) {
    console.error('Error updating admin pet:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren des Tieres' },
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

    const { data, error } = await auth.client
      .from('pets')
      .delete()
      .eq('id', params.id)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Tier nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting admin pet:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen des Tieres' },
      { status: 500 }
    )
  }
}
