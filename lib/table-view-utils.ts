import type { TableColumn } from './table-columns'
import type { TableViewColumnConfig, TableViewConfig } from './types'

export const SYSTEM_DEFAULT_VIEW_ID = '__system_default__'

export function createDefaultViewConfig(catalog: TableColumn[]): TableViewConfig {
  const defaultVisibleIds = new Set([
    'id',
    'vorname',
    'nachname',
    'email',
    'telefonnummer',
    'service',
    'status',
    'created_at',
    'updated_at',
  ])

  return {
    columns: catalog.map((column, index) => ({
      id: column.id,
      visible:
        defaultVisibleIds.has(column.id) ||
        column.isProperty === true,
      order: index,
      width: column.width,
    })),
  }
}

export function mergeViewConfigWithCatalog(
  catalog: TableColumn[],
  config: TableViewConfig | null | undefined
): TableViewConfig {
  const base = createDefaultViewConfig(catalog)
  if (!config?.columns?.length) {
    return base
  }

  const catalogIds = new Set(catalog.map((column) => column.id))
  const configById = new Map(config.columns.map((entry) => [entry.id, entry]))
  const merged: TableViewColumnConfig[] = []
  let order = 0

  const sortedExisting = [...config.columns]
    .filter((entry) => catalogIds.has(entry.id))
    .sort((a, b) => a.order - b.order)

  for (const entry of sortedExisting) {
    const column = catalog.find((item) => item.id === entry.id)
    if (!column) continue
    merged.push({
      id: entry.id,
      visible: entry.visible,
      order: order++,
      width: entry.width ?? column.width,
    })
  }

  for (const column of catalog) {
    if (configById.has(column.id)) continue
    merged.push({
      id: column.id,
      visible: column.isProperty === true,
      order: order++,
      width: column.width,
    })
  }

  return { columns: merged }
}

export function applyTableViewConfig(
  catalog: TableColumn[],
  config: TableViewConfig
): TableColumn[] {
  const merged = mergeViewConfigWithCatalog(catalog, config)
  const catalogById = new Map(catalog.map((column) => [column.id, column]))

  return merged.columns
    .filter((entry) => entry.visible)
    .sort((a, b) => a.order - b.order)
    .map((entry) => {
      const column = catalogById.get(entry.id)
      if (!column) return null
      return {
        ...column,
        width: entry.width ?? column.width,
      }
    })
    .filter((column): column is TableColumn => column !== null)
}

export function validateViewConfig(
  catalog: TableColumn[],
  config: unknown
): { valid: true; config: TableViewConfig } | { valid: false; error: string } {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Ungültige View-Konfiguration' }
  }

  const raw = config as { columns?: unknown }
  if (!Array.isArray(raw.columns)) {
    return { valid: false, error: 'Spalten-Konfiguration fehlt' }
  }

  const catalogIds = new Set(catalog.map((column) => column.id))
  const seen = new Set<string>()
  const columns: TableViewColumnConfig[] = []

  for (const entry of raw.columns) {
    if (!entry || typeof entry !== 'object') {
      return { valid: false, error: 'Ungültiger Spalteneintrag' }
    }

    const item = entry as Partial<TableViewColumnConfig>
    if (!item.id || typeof item.id !== 'string' || !catalogIds.has(item.id)) {
      return { valid: false, error: `Unbekannte Spalte: ${item.id ?? '?'}` }
    }
    if (seen.has(item.id)) {
      return { valid: false, error: `Doppelte Spalte: ${item.id}` }
    }
    seen.add(item.id)

    columns.push({
      id: item.id,
      visible: item.visible !== false,
      order: typeof item.order === 'number' ? item.order : columns.length,
      width: typeof item.width === 'number' ? item.width : undefined,
    })
  }

  return {
    valid: true,
    config: { columns: columns.sort((a, b) => a.order - b.order) },
  }
}

export function resolveActiveView(
  views: Array<{ id: string; scope: 'personal' | 'global'; is_default: boolean }>,
  preferredViewId?: string | null
): string {
  if (preferredViewId && views.some((view) => view.id === preferredViewId)) {
    return preferredViewId
  }

  const personalDefault = views.find(
    (view) => view.scope === 'personal' && view.is_default
  )
  if (personalDefault) return personalDefault.id

  const globalDefault = views.find(
    (view) => view.scope === 'global' && view.is_default
  )
  if (globalDefault) return globalDefault.id

  if (views.length > 0) {
    const personal = views.find((view) => view.scope === 'personal')
    if (personal) return personal.id
    return views[0].id
  }

  return SYSTEM_DEFAULT_VIEW_ID
}
