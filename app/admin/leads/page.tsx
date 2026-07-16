'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { AdminTableView, PropertyDefinition, TableViewConfig } from '@/lib/types'
import { DataTable } from '@/components/admin/data-table'
import { ColumnViewMenu } from '@/components/admin/column-view-menu'
import { getLeadColumnCatalog } from '@/lib/table-columns'
import type { TableColumn } from '@/lib/table-columns'
import {
  applyTableViewConfig,
  createDefaultViewConfig,
  mergeViewConfigWithCatalog,
  resolveActiveView,
  SYSTEM_DEFAULT_VIEW_ID,
} from '@/lib/table-view-utils'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

const ACTIVE_VIEW_STORAGE_KEY = 'lead-table-active-view-id'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Record<string, any>[]>([])
  const [propertyDefinitions, setPropertyDefinitions] = useState<PropertyDefinition[]>([])
  const [views, setViews] = useState<AdminTableView[]>([])
  const [catalog, setCatalog] = useState<TableColumn[]>([])
  const [viewConfig, setViewConfig] = useState<TableViewConfig>({ columns: [] })
  const [activeViewId, setActiveViewId] = useState<string>(SYSTEM_DEFAULT_VIEW_ID)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { toast } = useToast()

  const displayColumns = useMemo(
    () => applyTableViewConfig(catalog, viewConfig),
    [catalog, viewConfig]
  )

  const loadViews = useCallback(async (nextCatalog: TableColumn[]) => {
    const response = await authenticatedFetch('/api/admin/table-views?entity_type=lead')
    const data = await response.json()
    const loadedViews: AdminTableView[] = data.views || []
    setViews(loadedViews)

    const storedViewId =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY)
        : null

    const resolvedViewId = resolveActiveView(loadedViews, storedViewId)
    setActiveViewId(resolvedViewId)

    if (resolvedViewId === SYSTEM_DEFAULT_VIEW_ID) {
      setViewConfig(createDefaultViewConfig(nextCatalog))
      return
    }

    const activeView = loadedViews.find((view) => view.id === resolvedViewId)
    if (activeView) {
      setViewConfig(mergeViewConfigWithCatalog(nextCatalog, activeView.config))
    } else {
      setViewConfig(createDefaultViewConfig(nextCatalog))
    }
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const defResponse = await authenticatedFetch('/api/admin/properties?applies_to=lead')
      const defData = await defResponse.json()
      const definitions = defData.definitions || []
      setPropertyDefinitions(definitions)

      const nextCatalog = getLeadColumnCatalog(definitions)
      setCatalog(nextCatalog)

      await loadViews(nextCatalog)

      const url =
        statusFilter === 'all'
          ? '/api/admin/leads'
          : `/api/admin/leads?status=${statusFilter}`

      const response = await authenticatedFetch(url)
      const data = await response.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden der Daten',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  function handleActiveViewChange(viewId: string) {
    setActiveViewId(viewId)
    window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, viewId)

    if (viewId === SYSTEM_DEFAULT_VIEW_ID) {
      setViewConfig(createDefaultViewConfig(catalog))
      return
    }

    const view = views.find((item) => item.id === viewId)
    if (view) {
      setViewConfig(mergeViewConfigWithCatalog(catalog, view.config))
    }
  }

  async function handleCellUpdate(rowId: string | number, columnId: string, value: any) {
    try {
      const column = catalog.find((c) => c.id === columnId)
      if (!column) return

      if (column.isProperty && column.propertyDefinitionId) {
        const response = await authenticatedFetch('/api/admin/properties/values', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_definition_id: column.propertyDefinitionId,
            entity_type: 'lead',
            entity_id: rowId.toString(),
            value,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Fehler beim Speichern')
        }
      } else {
        const response = await authenticatedFetch('/api/admin/leads', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: rowId,
            [column.fieldName]: value,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Fehler beim Speichern')
        }
      }

      setLeads((prev) =>
        prev.map((lead) => {
          if (String(lead.id) === String(rowId)) {
            const fieldKey = column.isProperty ? column.id : column.fieldName
            return { ...lead, [fieldKey]: value }
          }
          return lead
        })
      )

      toast({
        title: 'Erfolg',
        description: 'Wert gespeichert',
      })
    } catch (error: any) {
      throw error
    }
  }

  function handleAddColumn() {
    loadData()
  }

  async function handleViewsReload() {
    await loadViews(catalog)
  }

  useEffect(() => {
    if (catalog.length === 0) return
    setViewConfig((current) => mergeViewConfigWithCatalog(catalog, current))
  }, [catalog, propertyDefinitions])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-sage-900">Leads</h1>
          <p className="mt-2 text-sage-600">Verwaltung aller Kontaktanfragen</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <ColumnViewMenu
            catalog={catalog}
            viewConfig={viewConfig}
            views={views}
            activeViewId={activeViewId}
            entityType="lead"
            onViewConfigChange={setViewConfig}
            onActiveViewChange={handleActiveViewChange}
            onViewsReload={handleViewsReload}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              Alle
            </Button>
            <Button
              variant={statusFilter === 'new' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('new')}
            >
              Neu
            </Button>
            <Button
              variant={statusFilter === 'contacted' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('contacted')}
            >
              Kontaktiert
            </Button>
          </div>
        </div>
      </div>

      <DataTable
        columns={displayColumns}
        data={leads}
        entityType="lead"
        loading={loading}
        onCellUpdate={handleCellUpdate}
        onAddColumn={handleAddColumn}
      />
    </div>
  )
}
