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

    const { data: settings, error } = await supabase
      .from('capacity_settings')
      .select('*')
      .order('service_type', { ascending: true, nullsFirst: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ settings: settings || [] })
  } catch (error: any) {
    console.error('Error fetching capacity settings:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Kapazitäten' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authError = await checkAdminAuth(supabase, accessToken)
    
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      )
    }

    const { settings } = await request.json()

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Ungültiges Format' },
        { status: 400 }
      )
    }

    // Upsert alle Settings
    const results = []
    for (const setting of settings) {
      const { service_type, default_capacity } = setting

      if (default_capacity === undefined || default_capacity < 1) {
        return NextResponse.json(
          { error: 'Ungültige Kapazität' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('capacity_settings')
        .upsert(
          {
            service_type: service_type || null,
            default_capacity,
          },
          {
            onConflict: 'service_type',
          }
        )
        .select()
        .single()

      if (error) {
        throw error
      }

      results.push(data)
    }

    return NextResponse.json({ settings: results })
  } catch (error: any) {
    console.error('Error updating capacity settings:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren der Kapazitäten' },
      { status: 500 }
    )
  }
}

