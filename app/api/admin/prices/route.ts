import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'

async function checkAdminAuth(supabase: any, accessToken: string | undefined) {
  if (!accessToken) {
    return { authorized: false, error: 'Nicht autorisiert' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: 'Nicht autorisiert' }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { authorized: false, error: 'Nicht autorisiert' }
  }

  return { authorized: true }
}

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
    const auth = await checkAdminAuth(supabase, accessToken)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    const [pricesRes, categoriesRes] = await Promise.all([
      supabase
        .from('prices')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabase
        .from('price_categories')
        .select('*')
        .order('sort_order', { ascending: true })
    ])

    if (pricesRes.error) {
      throw pricesRes.error
    }
    if (categoriesRes.error) {
      throw categoriesRes.error
    }

    return NextResponse.json({
      prices: pricesRes.data || [],
      categories: categoriesRes.data || []
    })
  } catch (error: any) {
    console.error('Error fetching prices:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Preise' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
    const auth = await checkAdminAuth(supabase, accessToken)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    const { prices } = await request.json()

    if (!Array.isArray(prices)) {
      return NextResponse.json(
        { error: 'Ungültige Daten' },
        { status: 400 }
      )
    }

    // Aktualisiere alle Preise
    const updates = await Promise.all(
      prices.map((price: any) =>
        supabase
          .from('prices')
          .update({
            name: price.name,
            description: price.description,
            price: price.price,
            price_type: price.price_type,
            unit: price.unit,
            note: price.note,
            sort_order: price.sort_order,
            category_id: price.category_id,
          })
          .eq('id', price.id)
      )
    )

    const errors = updates.filter((result: any) => result.error)
    if (errors.length > 0) {
      throw errors[0].error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating prices:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren der Preise' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
    const auth = await checkAdminAuth(supabase, accessToken)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    const { name, description, price, price_type, unit, note, sort_order, category_id } = await request.json()

    if (!name || !category_id || !price_type) {
      return NextResponse.json(
        { error: 'Name, Kategorie und Preistyp sind erforderlich' },
        { status: 400 }
      )
    }

    const { data: newPrice, error } = await supabase
      .from('prices')
      .insert({
        name,
        description,
        price: price_type === 'text' ? null : (price ? parseFloat(price) : null),
        price_type,
        unit: price_type === 'text' ? null : unit,
        note,
        sort_order: sort_order || 0,
        category_id
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ price: newPrice })
  } catch (error: any) {
    console.error('Error creating price:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen des Preises' },
      { status: 500 }
    )
  }
}


