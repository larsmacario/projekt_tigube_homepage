import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'

async function checkAdminAuth(supabase: any, accessToken: string | undefined) {
  if (!accessToken) {
    return { error: 'Nicht autorisiert - Keine Session gefunden', status: 401 }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Nicht autorisiert', status: 401 }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Nicht autorisiert', status: 403 }
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authError = await checkAdminAuth(supabase, accessToken)
    
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('capacity_overrides')
      .select('*')
      .order('date', { ascending: true })

    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ overrides: data || [] })
  } catch (error: any) {
    console.error('Error fetching capacity overrides:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Kapazitäts-Overrides' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authError = await checkAdminAuth(supabase, accessToken)
    
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      )
    }

    const { date, service_type, capacity, reason } = await request.json()

    if (!date || !capacity || capacity < 1) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen oder ungültig' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('capacity_overrides')
      .upsert(
        {
          date,
          service_type: service_type || null,
          capacity,
          reason: reason || null,
        },
        {
          onConflict: 'date,service_type',
        }
      )
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ override: data })
  } catch (error: any) {
    console.error('Error creating capacity override:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen des Overrides' },
      { status: 500 }
    )
  }
}

