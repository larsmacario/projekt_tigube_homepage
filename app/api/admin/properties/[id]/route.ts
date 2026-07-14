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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authError = await checkAdminAuth(supabase, accessToken)
    
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      )
    }

    const { id } = params
    const body = await request.json()
    const { name, label, field_type, options, required, applies_to, sort_order } = body

    // Validierung
    if (field_type) {
      const validFieldTypes = ['text', 'number', 'date', 'select', 'checkbox', 'textarea']
      if (!validFieldTypes.includes(field_type)) {
        return NextResponse.json(
          { error: 'Ungültiger Feldtyp' },
          { status: 400 }
        )
      }
    }

    // Für select-Felder müssen Optionen vorhanden sein
    if (field_type === 'select' && (!options || !Array.isArray(options) || options.length === 0)) {
      return NextResponse.json(
        { error: 'Select-Felder benötigen mindestens eine Option' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (label !== undefined) updateData.label = label
    if (field_type !== undefined) updateData.field_type = field_type
    if (options !== undefined) updateData.options = JSON.stringify(options)
    if (required !== undefined) updateData.required = required
    if (applies_to !== undefined) updateData.applies_to = applies_to
    if (sort_order !== undefined) updateData.sort_order = sort_order

    const { data, error } = await supabase
      .from('property_definitions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Parse options
    const definition = {
      ...data,
      options: Array.isArray(data.options) ? data.options : (data.options ? JSON.parse(data.options) : [])
    }

    return NextResponse.json({ definition })
  } catch (error: any) {
    console.error('Error updating property definition:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren der Eigenschafts-Definition' },
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
    const authError = await checkAdminAuth(supabase, accessToken)
    
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      )
    }

    const { id } = params

    const { error } = await supabase
      .from('property_definitions')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting property definition:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen der Eigenschafts-Definition' },
      { status: 500 }
    )
  }
}

