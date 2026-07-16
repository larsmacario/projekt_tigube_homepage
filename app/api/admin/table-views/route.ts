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

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const auth = await checkAdminAuth(supabase, accessToken)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type') as TableViewEntityType | null

    if (!entityType || !['lead', 'customer'].includes(entityType)) {
      return NextResponse.json(
        { error: 'entity_type ist erforderlich (lead oder customer)' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('admin_table_views')
      .select('*')
      .eq('entity_type', entityType)
      .or(`scope.eq.global,and(scope.eq.personal,user_id.eq.${auth.user.id})`)
      .order('scope', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      views: (data || []).map(parseViewRow),
    })
  } catch (error: any) {
    console.error('Error fetching table views:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Tabellen-Views' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const auth = await checkAdminAuth(supabase, accessToken)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { name, entity_type, scope, config, is_default } = body as {
      name?: string
      entity_type?: TableViewEntityType
      scope?: TableViewScope
      config?: TableViewConfig
      is_default?: boolean
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    if (!entity_type || !['lead', 'customer'].includes(entity_type)) {
      return NextResponse.json({ error: 'Ungültiger entity_type' }, { status: 400 })
    }

    if (!scope || !['personal', 'global'].includes(scope)) {
      return NextResponse.json({ error: 'Ungültiger scope' }, { status: 400 })
    }

    const catalog = await getCatalogForEntity(entity_type, supabase)
    const validation = validateViewConfig(catalog, config)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    if (is_default) {
      await clearDefaultViews(
        supabase,
        entity_type,
        scope,
        scope === 'personal' ? auth.user.id : undefined
      )
    }

    const { data, error } = await supabase
      .from('admin_table_views')
      .insert({
        name: name.trim(),
        entity_type,
        scope,
        user_id: scope === 'personal' ? auth.user.id : null,
        created_by: auth.user.id,
        config: validation.config,
        is_default: Boolean(is_default),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ view: parseViewRow(data) })
  } catch (error: any) {
    console.error('Error creating table view:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen der Tabellen-View' },
      { status: 500 }
    )
  }
}
