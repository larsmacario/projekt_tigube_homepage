import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServerClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Supabase Cookie-Namen basierend auf Projekt-URL
  // Format: sb-<project-ref>-auth-token
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default'
  const cookieName = `sb-${projectRef}-auth-token`
  
  // Hole Session aus Cookie
  const authCookie = request.cookies.get(cookieName)?.value
  let accessToken: string | undefined

  if (authCookie) {
    try {
      // Cookie enthält JSON mit access_token und refresh_token
      const sessionData = JSON.parse(decodeURIComponent(authCookie))
      accessToken = sessionData.access_token
    } catch (e) {
      // Fallback: Versuche direkt als Token
      accessToken = authCookie
    }
  }

  // Fallback: Versuche aus Authorization Header
  if (!accessToken) {
    const authHeader = request.headers.get('authorization')
    accessToken = authHeader?.replace('Bearer ', '')
  }

  // Fallback: Versuche aus Custom Cookie
  if (!accessToken) {
    accessToken = request.cookies.get('sb-access-token')?.value
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return { client, accessToken }
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Die Server-Konfiguration für die Datenbankverwaltung fehlt')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = getServerClient(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }

    // Prüfe ob User eingeloggt ist
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    // Prüfe Admin-Rechte
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('contacts')
      .select('*')
      .eq('contact_type', 'lead')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: leads, error } = await query

    if (error) {
      throw error
    }

    // Lade Property Values für alle Leads
    const leadIds = (leads || []).map((l: any) => l.id.toString())
    let propertyValues: any[] = []

    if (leadIds.length > 0) {
      const { data: values, error: valuesError } = await supabase
        .from('property_values')
        .select(`
          *,
          property_definition:property_definitions(*)
        `)
        .eq('entity_type', 'lead')
        .in('entity_id', leadIds)

      if (!valuesError && values) {
        propertyValues = values
      }
    }

    // Erweitere Leads mit Property Values
    const leadsWithProperties = (leads || []).map((lead: any) => {
      const leadProperties: Record<string, any> = {}
      propertyValues
        .filter(pv => pv.entity_id === lead.id.toString())
        .forEach(pv => {
          const propId = `property_${pv.property_definition_id}`
          // Bestimme Wert basierend auf Feldtyp
          if (pv.value_text !== null) leadProperties[propId] = pv.value_text
          else if (pv.value_number !== null) leadProperties[propId] = pv.value_number
          else if (pv.value_date !== null) leadProperties[propId] = pv.value_date
          else if (pv.value_boolean !== null) leadProperties[propId] = pv.value_boolean
        })
      return { ...lead, ...leadProperties }
    })

    return NextResponse.json({ leads: leadsWithProperties })
  } catch (error: any) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Leads' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = getServerClient(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }

    // Prüfe ob User eingeloggt ist
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    // Prüfe Admin-Rechte
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      )
    }

    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID ist erforderlich' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .in('contact_type', ['lead', 'lost'])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ lead: data })
  } catch (error: any) {
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren des Leads' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = getServerClient(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const adminSupabase = getAdminClient()

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'ID ist erforderlich' }, { status: 400 })
    }

    const { data: lead, error: leadError } = await adminSupabase
      .from('contacts')
      .select('id')
      .eq('id', id)
      .eq('contact_type', 'lead')
      .maybeSingle()

    if (leadError) throw leadError
    if (!lead) {
      return NextResponse.json({ error: 'Lead nicht gefunden' }, { status: 404 })
    }

    const { error: propertiesError } = await adminSupabase
      .from('property_values')
      .delete()
      .eq('entity_type', 'lead')
      .eq('entity_id', id)
    if (propertiesError) throw propertiesError

    const { error: notesError } = await adminSupabase
      .from('notes')
      .delete()
      .eq('contact_id', id)
    if (notesError) throw notesError

    const { data: deletedLead, error: deleteError } = await adminSupabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('contact_type', 'lead')
      .select('id')
      .maybeSingle()
    if (deleteError) throw deleteError
    if (!deletedLead) {
      throw new Error('Lead konnte nicht gelöscht werden')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen des Leads' },
      { status: 500 }
    )
  }
}
