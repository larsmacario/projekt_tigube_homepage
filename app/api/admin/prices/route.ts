import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { isMissingDbObject, normalizeCatalogPriceRow } from '@/lib/price-legacy-compat'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { client: supabase } = auth

    const [pricesRes, categoriesRes, serviceAreasRes] = await Promise.all([
      supabase
        .from('prices')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabase
        .from('price_categories')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabase
        .from('service_areas')
        .select('*')
        .order('sort_order', { ascending: true }),
    ])

    if (pricesRes.error) {
      throw pricesRes.error
    }
    if (categoriesRes.error) {
      throw categoriesRes.error
    }

    const prices = (pricesRes.data || []).map((row) => normalizeCatalogPriceRow(row))

    return NextResponse.json({
      prices,
      categories: categoriesRes.data || [],
      serviceAreas: serviceAreasRes.error ? [] : serviceAreasRes.data || [],
    })
  } catch (error: unknown) {
    console.error('Error fetching prices:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Preise'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function updatePriceRow(supabase: SupabaseClient, price: Record<string, unknown>) {
  const baseUpdate = {
    name: price.name,
    description: price.description,
    price: price.price,
    price_type: price.price_type,
    unit: price.unit,
    note: price.note,
    sort_order: price.sort_order,
    category_id: price.category_id,
  }

  const fullUpdate = {
    ...baseUpdate,
    usage: price.usage ?? 'extra',
    archived_at: price.archived_at ?? null,
    sevdesk_article_id: price.sevdesk_article_id ?? null,
  }

  const firstAttempt = await supabase
    .from('prices')
    .update(fullUpdate)
    .eq('id', price.id)

  if (!firstAttempt.error) return firstAttempt

  if (isMissingDbObject(firstAttempt.error)) {
    return supabase.from('prices').update(baseUpdate).eq('id', price.id)
  }

  return firstAttempt
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { client: supabase } = auth
    const { prices } = await request.json()

    if (!Array.isArray(prices)) {
      return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 })
    }

    const updates = await Promise.all(prices.map((price: Record<string, unknown>) => updatePriceRow(supabase, price)))

    const errors = updates.filter((result) => result.error)
    if (errors.length > 0) {
      throw errors[0].error
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error updating prices:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Preise'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { client: supabase } = auth

    const { name, description, price, price_type, unit, note, sort_order, category_id, usage } =
      await request.json()

    if (!name || !category_id || !price_type) {
      return NextResponse.json(
        { error: 'Name, Kategorie und Preistyp sind erforderlich' },
        { status: 400 }
      )
    }

    const baseInsert = {
      name,
      description,
      price: price_type === 'text' ? null : price ? parseFloat(price) : null,
      price_type,
      unit: price_type === 'text' ? null : unit,
      note,
      sort_order: sort_order || 0,
      category_id,
    }

    const fullInsert = {
      ...baseInsert,
      usage: usage ?? 'extra',
    }

    let result = await supabase.from('prices').insert(fullInsert).select().single()

    if (result.error && isMissingDbObject(result.error)) {
      result = await supabase.from('prices').insert(baseInsert).select().single()
    }

    if (result.error) {
      throw result.error
    }

    return NextResponse.json({
      price: normalizeCatalogPriceRow(result.data),
    })
  } catch (error: unknown) {
    console.error('Error creating price:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Erstellen des Preises'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
