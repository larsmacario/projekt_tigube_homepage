import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getAdminDbClient } from '@/lib/admin-auth'

async function checkAdminAuth(supabase: any, accessToken: string | undefined) {
  if (!accessToken) {
    return { error: 'Nicht autorisiert - Keine Session gefunden', status: 401, userData: null }
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Nicht autorisiert', status: 401, userData: null }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Nicht autorisiert', status: 403, userData: null }
  }

  return { error: null, status: 200, userData }
}

async function getBookingGroupContext(bookingId: string) {
  const admin = getAdminDbClient()
  const { data: booking, error } = await admin
    .from('bookings')
    .select('id, request_group_id, customer_id, start_date, end_date')
    .eq('id', bookingId)
    .single()

  if (error || !booking) {
    return { error: 'Buchung nicht gefunden', status: 404, booking: null, siblings: [] as any[] }
  }

  const groupKey = booking.request_group_id ?? booking.id

  let siblingsQuery = admin.from('bookings').select(`
      id,
      pet_id,
      service_type,
      start_date,
      end_date,
      status,
      pet:pets(id, name, tierart)
    `)

  if (booking.request_group_id) {
    siblingsQuery = siblingsQuery.eq('request_group_id', booking.request_group_id)
  } else {
    siblingsQuery = siblingsQuery.eq('id', booking.id)
  }

  const { data: siblings } = await siblingsQuery

  const { data: lineItems } = await admin
    .from('booking_line_items')
    .select('*')
    .eq('request_group_id', groupKey)
    .order('created_at', { ascending: true })

  return {
    error: null,
    status: 200,
    booking,
    requestGroupId: groupKey,
    siblings: siblings || [],
    lineItems: lineItems || [],
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const ctx = await getBookingGroupContext(params.id)
    if (ctx.error) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    return NextResponse.json({
      request_group_id: ctx.requestGroupId,
      siblings: ctx.siblings,
      line_items: ctx.lineItems,
    })
  } catch (error: any) {
    console.error('Error loading line items:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Positionen' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const ctx = await getBookingGroupContext(params.id)
    if (ctx.error || !ctx.requestGroupId) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const body = await request.json()
    const {
      price_id,
      label,
      description,
      price_type = 'fixed',
      unit,
      quantity = 1,
      unit_price,
      line_total,
      booking_id,
    } = body

    if (!label && !price_id) {
      return NextResponse.json({ error: 'Bezeichnung oder Preis erforderlich' }, { status: 400 })
    }

    const admin = getAdminDbClient()
    let insertRow: Record<string, unknown> = {
      request_group_id: ctx.requestGroupId,
      booking_id: booking_id || null,
      price_id: price_id || null,
      label: label || 'Position',
      description: description || null,
      price_type,
      unit: unit || null,
      quantity: Math.max(1, Number(quantity) || 1),
      unit_price: unit_price != null ? Number(unit_price) : null,
      line_total: line_total != null ? Number(line_total) : null,
      source: 'admin',
      created_by: authResult.userData!.id,
    }

    if (price_id) {
      const { data: priceRow } = await admin.from('prices').select('*').eq('id', price_id).single()
      if (priceRow) {
        insertRow = {
          ...insertRow,
          label: label || priceRow.name,
          description: description ?? priceRow.description,
          price_type: priceRow.price_type,
          unit: unit ?? priceRow.unit,
          unit_price:
            insertRow.unit_price ??
            (priceRow.price_type === 'percentage' ? Number(priceRow.price) : Number(priceRow.price)),
          line_total:
            insertRow.line_total ??
            (priceRow.price_type === 'percentage'
              ? null
              : Number(priceRow.price) * Number(insertRow.quantity)),
        }
      }
    }

    const { data, error } = await admin.from('booking_line_items').insert(insertRow).select('*').single()

    if (error) {
      throw error
    }

    return NextResponse.json({ line_item: data })
  } catch (error: any) {
    console.error('Error creating line item:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Anlegen der Position' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const { line_item_id, label, description, quantity, unit_price, line_total } = body

    if (!line_item_id) {
      return NextResponse.json({ error: 'line_item_id fehlt' }, { status: 400 })
    }

    const ctx = await getBookingGroupContext(params.id)
    if (ctx.error) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const admin = getAdminDbClient()
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (label !== undefined) updates.label = label
    if (description !== undefined) updates.description = description
    if (quantity !== undefined) updates.quantity = Math.max(1, Number(quantity) || 1)
    if (unit_price !== undefined) updates.unit_price = unit_price != null ? Number(unit_price) : null
    if (line_total !== undefined) updates.line_total = line_total != null ? Number(line_total) : null

    const { data, error } = await admin
      .from('booking_line_items')
      .update(updates)
      .eq('id', line_item_id)
      .eq('request_group_id', ctx.requestGroupId)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ line_item: data })
  } catch (error: any) {
    console.error('Error updating line item:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const lineItemId = searchParams.get('line_item_id')

    if (!lineItemId) {
      return NextResponse.json({ error: 'line_item_id fehlt' }, { status: 400 })
    }

    const ctx = await getBookingGroupContext(params.id)
    if (ctx.error) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const admin = getAdminDbClient()
    const { data: existing } = await admin
      .from('booking_line_items')
      .select('id, source')
      .eq('id', lineItemId)
      .eq('request_group_id', ctx.requestGroupId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Position nicht gefunden' }, { status: 404 })
    }

    const { error } = await admin
      .from('booking_line_items')
      .delete()
      .eq('id', lineItemId)
      .eq('request_group_id', ctx.requestGroupId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting line item:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen' },
      { status: 500 }
    )
  }
}
