import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import type { PropertyValue } from '@/lib/types'

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
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entity_type und entity_id sind erforderlich' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('property_values')
      .select(`
        *,
        property_definition:property_definitions(*)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)

    if (error) {
      throw error
    }

    // Parse options in property definitions
    const values = (data || []).map((value: any) => {
      const def = value.property_definition
      if (def) {
        def.options = Array.isArray(def.options) ? def.options : (def.options ? JSON.parse(def.options) : [])
      }
      return value
    })

    return NextResponse.json({ values })
  } catch (error: any) {
    console.error('Error fetching property values:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Eigenschafts-Werte' },
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

    const body = await request.json()
    const { property_definition_id, entity_type, entity_id, value } = body

    if (!property_definition_id || !entity_type || !entity_id) {
      return NextResponse.json(
        { error: 'property_definition_id, entity_type und entity_id sind erforderlich' },
        { status: 400 }
      )
    }

    // Hole Property Definition um Feldtyp zu bestimmen
    const { data: definition, error: defError } = await supabase
      .from('property_definitions')
      .select('field_type')
      .eq('id', property_definition_id)
      .single()

    if (defError || !definition) {
      return NextResponse.json(
        { error: 'Eigenschafts-Definition nicht gefunden' },
        { status: 404 }
      )
    }

    // Bereite Wert basierend auf Feldtyp vor
    const valueData: any = {
      property_definition_id,
      entity_type,
      entity_id,
    }

    switch (definition.field_type) {
      case 'text':
      case 'textarea':
        valueData.value_text = value || null
        break
      case 'number':
        valueData.value_number = value !== null && value !== undefined ? parseFloat(value) : null
        break
      case 'date':
        valueData.value_date = value || null
        break
      case 'checkbox':
        valueData.value_boolean = value === true || value === 'true' || value === 1
        break
      case 'select':
        valueData.value_text = value || null
        break
      default:
        return NextResponse.json(
          { error: 'Ungültiger Feldtyp' },
          { status: 400 }
        )
    }

    // Prüfe ob bereits ein Wert existiert (UPSERT)
    const { data: existing } = await supabase
      .from('property_values')
      .select('id')
      .eq('property_definition_id', property_definition_id)
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .single()

    let result
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('property_values')
        .update(valueData)
        .eq('id', existing.id)
        .select(`
          *,
          property_definition:property_definitions(*)
        `)
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert
      const { data, error } = await supabase
        .from('property_values')
        .insert(valueData)
        .select(`
          *,
          property_definition:property_definitions(*)
        `)
        .single()

      if (error) throw error
      result = data
    }

    // Parse options
    if (result.property_definition) {
      result.property_definition.options = Array.isArray(result.property_definition.options)
        ? result.property_definition.options
        : (result.property_definition.options ? JSON.parse(result.property_definition.options) : [])
    }

    return NextResponse.json({ value: result })
  } catch (error: any) {
    console.error('Error creating/updating property value:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Speichern des Eigenschafts-Wertes' },
      { status: 500 }
    )
  }
}

