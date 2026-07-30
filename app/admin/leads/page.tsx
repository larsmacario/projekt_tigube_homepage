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
import { readApiResponse } from '@/lib/read-api-response'

const ACTIVE_VIEW_STORAGE_KEY = 'lead-table-active-view-id'

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Record<string, unknown>[]>([])
  const [propertyDefinitions, setPropertyDefinitions] = useState<PropertyDefinition[]>([])
  const [views, setViews] = useState<AdminTableView[]>([])
  const [catalog, setCatalog] = useState<TableColumn[]>([])
  const [viewConfig, setViewConfig] = useState<TableViewConfig>({ columns: [] })
  const [activeViewId, setActiveViewId] = useState<string>(SYSTEM_DEFAULT_VIEW_ID)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [reloadKey, setReloadKey] = useState(0)
  const { toast } = useToast()

  const displayColumns = useMemo(
    () => applyTableViewConfig(catalog, viewConfig),
    [catalog, viewConfig]
  )

  const loadViews = useCallback(async (nextCatalog: TableColumn[], signal?: AbortSignal) => {
    const response = await authenticatedFetch('/api/admin/table-views?entity_type=lead', { signal })
    const { data, error } = await readApiResponse<{ views?: AdminTableView[] }>(response)
    if (error) {
      throw new Error(error)
    }

    const loadedViews = data?.views || []
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

  useEffect(() => {
    const controller = new AbortController()

    async function loadData() {
      setLoading(true)
      try {
        const defResponse = await authenticatedFetch('/api/admin/properties?applies_to=lead', {
          signal: controller.signal,
        })
        const { data: defData, error: defError } = await readApiResponse<{ definitions?: PropertyDefinition[] }>(
          defResponse
        )
        if (defError) {
          throw new Error(defError)
        }

        const definitions = defData?.definitions || []
        setPropertyDefinitions(definitions)

        const nextCatalog = getLeadColumnCatalog(definitions)
        setCatalog(nextCatalog)

        await loadViews(nextCatalog, controller.signal)

        const params = new URLSearchParams()
        if (typeFilter !== 'all') {
          params.set('type', typeFilter)
        }
        if (statusFilter !== 'all' && typeFilter !== 'lost') {
          params.set('status', statusFilter)
        }
        const query = params.toString()
        const url = query ? `/api/admin/leads?${query}` : '/api/admin/leads'

        const response = await authenticatedFetch(url, { signal: controller.signal })
        const { data, error } = await readApiResponse<{ leads?: Record<string, unknown>[] }>(response)
        if (error) {
          throw new Error(error)
        }

        setLeads(data?.leads || [])
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          return
        }
        console.error('Error loading data:', error)
        toast({
          title: 'Fehler',
          description: error instanceof Error ? error.message : 'Fehler beim Laden der Daten',
          variant: 'destructive',
        })
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      controller.abort()
    }
  }, [statusFilter, typeFilter, reloadKey, loadViews, toast])

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

  async function handleCellUpdate(rowId: string | number, columnId: string, value: unknown) {
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

      const { error } = await readApiResponse(response)
      if (error) {
        throw new Error(error)
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

      const { error } = await readApiResponse(response)
      if (error) {
        throw new Error(error)
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
  }

  function handleAddColumn() {
    setReloadKey((current) => current + 1)
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
              variant={statusFilter === 'all' && typeFilter !== 'lost' && typeFilter !== 'waitlist' ? 'default' : 'outline'}
              onClick={() => {
                setTypeFilter('all')
                setStatusFilter('all')
              }}
            >
              Alle
            </Button>
            <Button
              variant={statusFilter === 'new' && typeFilter !== 'lost' && typeFilter !== 'waitlist' ? 'default' : 'outline'}
              onClick={() => {
                setTypeFilter('all')
                setStatusFilter('new')
              }}
            >
              Neu
            </Button>
            <Button
              variant={statusFilter === 'contacted' && typeFilter !== 'lost' && typeFilter !== 'waitlist' ? 'default' : 'outline'}
              onClick={() => {
                setTypeFilter('all')
                setStatusFilter('contacted')
              }}
            >
              Kontaktiert
            </Button>
            <Button
              variant={typeFilter === 'waitlist' ? 'default' : 'outline'}
              onClick={() => {
                setTypeFilter('waitlist')
                setStatusFilter('all')
              }}
            >
              Warteliste
            </Button>
            <Button
              variant={typeFilter === 'lost' ? 'default' : 'outline'}
              onClick={() => {
                setTypeFilter('lost')
                setStatusFilter('all')
              }}
            >
              Weitergeleitet
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
