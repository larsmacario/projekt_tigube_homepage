import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const supabase = auth.client

    const { searchParams } = new URL(request.url)
    const appliesTo = searchParams.get('applies_to')

    let query = supabase
      .from('property_definitions')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (appliesTo) {
      query = query.contains('applies_to', [appliesTo])
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    const definitions = (data || []).map((def: { options?: unknown }) => ({
      ...def,
      options: parsePropertyOptions(def.options),
    }))

    return NextResponse.json({ definitions })
  } catch (error: unknown) {
    console.error('Error fetching property definitions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Laden der Eigenschafts-Definitionen' },
      { status: 500 }
    )
  }
}

function parsePropertyOptions(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options.map(String)
  }
  if (typeof options === 'string' && options.trim()) {
    try {
      const parsed = JSON.parse(options)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const supabase = auth.client
    const body = await request.json()
    const { name, label, field_type, options, required, applies_to, sort_order } = body

    if (!name || !label || !field_type) {
      return NextResponse.json(
        { error: 'Name, Label und Feldtyp sind erforderlich' },
        { status: 400 }
      )
    }

    // Validierung
    const validFieldTypes = ['text', 'number', 'date', 'select', 'checkbox', 'textarea']
    if (!validFieldTypes.includes(field_type)) {
      return NextResponse.json(
        { error: 'Ungültiger Feldtyp' },
        { status: 400 }
      )
    }

    // Für select-Felder müssen Optionen vorhanden sein
    if (field_type === 'select' && (!options || !Array.isArray(options) || options.length === 0)) {
      return NextResponse.json(
        { error: 'Select-Felder benötigen mindestens eine Option' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('property_definitions')
      .insert({
        name,
        label,
        field_type,
        options: options ? JSON.stringify(options) : '[]',
        required: required || false,
        applies_to: applies_to || ['lead', 'customer'],
        sort_order: sort_order || 0,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    const definition = {
      ...data,
      options: parsePropertyOptions(data.options),
    }

    return NextResponse.json({ definition })
  } catch (error: unknown) {
    console.error('Error creating property definition:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Erstellen der Eigenschafts-Definition' },
      { status: 500 }
    )
  }
}

