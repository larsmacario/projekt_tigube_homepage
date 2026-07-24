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
    const customerId = searchParams.get('customer_id')

    if (!customerId) {
      return NextResponse.json({ error: 'customer_id ist erforderlich' }, { status: 400 })
    }

    const { data: overrides, error } = await supabase
      .from('customer_prices')
      .select('*')
      .eq('customer_id', customerId)

    if (error) throw error

    return NextResponse.json({ overrides: overrides || [] })
  } catch (error: any) {
    console.error('Error fetching customer prices:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Kundenpreise' },
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
    const { customer_id, overrides } = await request.json()

    if (!customer_id) {
      return NextResponse.json({ error: 'customer_id ist erforderlich' }, { status: 400 })
    }

    if (!Array.isArray(overrides)) {
      return NextResponse.json({ error: 'overrides muss ein Array sein' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('customer_prices')
      .delete()
      .eq('customer_id', customer_id)

    if (deleteError) throw deleteError

    if (overrides.length > 0) {
      const recordsToInsert = overrides
        .map((o: any) => normalizeOverridePayload(o))
        .filter(Boolean)
        .map((o) => ({
          customer_id,
          price_id: o!.price_id,
          price: o!.price,
          discount_type: o!.discount_type ?? null,
          discount_value: o!.discount_value ?? null,
        }))

      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('customer_prices')
          .insert(recordsToInsert)

        if (insertError) throw insertError
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating customer prices:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Speichern der Kundenpreise' },
      { status: 500 }
    )
  }
}
