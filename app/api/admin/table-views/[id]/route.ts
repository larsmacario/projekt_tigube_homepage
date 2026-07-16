import { NextRequest, NextResponse } from 'next/server'
import { getLeadColumnCatalog } from '@/lib/table-columns'
import { validateViewConfig } from '@/lib/table-view-utils'
import { getServerClient } from '@/lib/admin-auth'
import type { AdminTableView, TableViewConfig, TableViewEntityType, TableViewScope } from '@/lib/types'

async function checkAdminAuth(supabase: any, accessToken: string | undefined) {
  if (!accessToken) {
    return { error: 'Nicht autorisiert - Keine Session gefunden', status: 401 as const }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Nicht autorisiert', status: 401 as const }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Nicht autorisiert', status: 403 as const }
  }

  return { user }
}

function parseViewRow(row: any): AdminTableView {
  return {
    ...row,
    config: row.config as TableViewConfig,
  }
}

async function getCatalogForEntity(entityType: TableViewEntityType, supabase: any) {
  if (entityType === 'lead') {
    const { data } = await supabase
      .from('property_definitions')
      .select('*')
      .contains('applies_to', ['lead'])
      .order('sort_order', { ascending: true })

    const definitions = (data || []).map((def: any) => ({
      ...def,
      options: Array.isArray(def.options)
        ? def.options
        : def.options
          ? JSON.parse(def.options)
          : [],
    }))

    return getLeadColumnCatalog(definitions)
  }

  return getLeadColumnCatalog([])
}

async function clearDefaultViews(
  supabase: any,
  entityType: TableViewEntityType,
  scope: TableViewScope,
  userId?: string
) {
  let query = supabase
    .from('admin_table_views')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('entity_type', entityType)
    .eq('scope', scope)
    .eq('is_default', true)

  if (scope === 'personal' && userId) {
    query = query.eq('user_id', userId)
  }

  await query
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client: supabase, accessToken } = await getServerClient(request)
    const auth = await checkAdminAuth(supabase, accessToken)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('admin_table_views')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'View nicht gefunden' }, { status: 404 })
    }

    if (
      existing.scope === 'personal' &&
      existing.user_id !== auth.user.id
    ) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await request.json()
    const { name, config, is_default } = body as {
      name?: string
      config?: TableViewConfig
      is_default?: boolean
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Name darf nicht leer sein' }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (config !== undefined) {
      const catalog = await getCatalogForEntity(existing.entity_type, supabase)
      const validation = validateViewConfig(catalog, config)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
      updateData.config = validation.config
    }

    if (is_default !== undefined) {
      if (is_default) {
        await clearDefaultViews(
          supabase,
          existing.entity_type,
          existing.scope,
          existing.scope === 'personal' ? auth.user.id : undefined
        )
      }
      updateData.is_default = is_default
    }

    const { data, error } = await supabase
      .from('admin_table_views')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ view: parseViewRow(data) })
  } catch (error: any) {
    console.error('Error updating table view:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren der Tabellen-View' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client: supabase, accessToken } = await getServerClient(request)
    const auth = await checkAdminAuth(supabase, accessToken)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('admin_table_views')
      .select('scope, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'View nicht gefunden' }, { status: 404 })
    }

    if (
      existing.scope === 'personal' &&
      existing.user_id !== auth.user.id
    ) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const { error } = await supabase
      .from('admin_table_views')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting table view:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen der Tabellen-View' },
      { status: 500 }
    )
  }
}
