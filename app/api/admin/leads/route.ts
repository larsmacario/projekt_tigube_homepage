import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getAdminDbClient } from '@/lib/admin-auth'
import { LEAD_EDITABLE_FIELDS, pickAllowedFields } from '@/lib/contact-editable-fields'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

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
    const typeFilter = searchParams.get('type')

    let query = supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (typeFilter === 'lost') {
      query = query.eq('contact_type', 'lost')
    } else if (typeFilter === 'lead') {
      query = query.eq('contact_type', 'lead')
    } else {
      query = query.in('contact_type', ['lead', 'lost'])
    }

    if (status && typeFilter !== 'lost') {
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
    const { client: supabase, accessToken } = await getServerClient(request)

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

    const body = await request.json()
    const { id, ...rawUpdates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID ist erforderlich' },
        { status: 400 }
      )
    }

    const updates = pickAllowedFields(rawUpdates, LEAD_EDITABLE_FIELDS)
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Felder zum Aktualisieren' },
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
    const { client: supabase, accessToken } = await getServerClient(request)

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

    const adminSupabase = getAdminDbClient()

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
