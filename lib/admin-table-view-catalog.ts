import {
  getCustomerColumnCatalog,
  getLeadColumnCatalog,
  type TableColumn,
} from '@/lib/table-columns'
import type { PropertyDefinition, TableViewEntityType } from '@/lib/types'

function parsePropertyDefinitions(data: unknown[]): PropertyDefinition[] {
  return (data || []).map((def: any) => ({
    ...def,
    options: Array.isArray(def.options)
      ? def.options
      : def.options
        ? JSON.parse(def.options)
        : [],
  }))
}

export async function getCatalogForEntity(
  entityType: TableViewEntityType,
  supabase: any
): Promise<TableColumn[]> {
  if (entityType === 'lead') {
    const { data } = await supabase
      .from('property_definitions')
      .select('*')
      .contains('applies_to', ['lead'])
      .order('sort_order', { ascending: true })

    return getLeadColumnCatalog(parsePropertyDefinitions(data || []))
  }

  const [definitionsResult, groupsResult] = await Promise.all([
    supabase
      .from('property_definitions')
      .select('*')
      .contains('applies_to', ['customer'])
      .order('sort_order', { ascending: true }),
    supabase.from('customer_groups').select('id, name').order('name', { ascending: true }),
  ])

  const groupsMap: Record<string, string> = {}
  for (const group of (groupsResult.data || []) as Array<{ id: string; name: string }>) {
    groupsMap[group.id] = group.name
  }

  return getCustomerColumnCatalog(
    parsePropertyDefinitions(definitionsResult.data || []),
    groupsMap
  )
}
