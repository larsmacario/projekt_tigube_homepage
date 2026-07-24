import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { normalizeOverridePayload } from '@/lib/price-override'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { client: supabase } = auth
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('group_id')

    if (!groupId) {
      return NextResponse.json({ error: 'group_id ist erforderlich' }, { status: 400 })
    }

    const { data: overrides, error } = await supabase
      .from('group_prices')
      .select('*')
      .eq('group_id', groupId)

    if (error) throw error

    return NextResponse.json({ overrides: overrides || [] })
  } catch (error: any) {
    console.error('Error fetching group prices:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Gruppenpreise' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { client: supabase } = auth
    const { group_id, overrides } = await request.json()

    if (!group_id) {
      return NextResponse.json({ error: 'group_id ist erforderlich' }, { status: 400 })
    }

    if (!Array.isArray(overrides)) {
      return NextResponse.json({ error: 'overrides muss ein Array sein' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('group_prices')
      .delete()
      .eq('group_id', group_id)

    if (deleteError) throw deleteError

    if (overrides.length > 0) {
      const recordsToInsert = overrides
        .map((o: any) => normalizeOverridePayload(o))
        .filter(Boolean)
        .map((o) => ({
          group_id,
          price_id: o!.price_id,
          price: o!.price,
          discount_type: o!.discount_type ?? null,
          discount_value: o!.discount_value ?? null,
        }))

      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('group_prices')
          .insert(recordsToInsert)

        if (insertError) throw insertError
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating group prices:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Speichern der Gruppenpreise' },
      { status: 500 }
    )
  }
}
