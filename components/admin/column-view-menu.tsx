'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { TableColumn } from '@/lib/table-columns'
import {
  createDefaultViewConfig,
  mergeViewConfigWithCatalog,
  SYSTEM_DEFAULT_VIEW_ID,
} from '@/lib/table-view-utils'
import type {
  AdminTableView,
  TableViewColumnConfig,
  TableViewConfig,
  TableViewEntityType,
  TableViewScope,
} from '@/lib/types'
import { Columns3, GripVertical, Globe, Save, Trash2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ColumnViewMenuProps {
  catalog: TableColumn[]
  viewConfig: TableViewConfig
  views: AdminTableView[]
  activeViewId: string
  entityType: TableViewEntityType
  onViewConfigChange: (config: TableViewConfig) => void
  onActiveViewChange: (viewId: string) => void
  onViewsReload: () => Promise<void>
}

function getColumnLabel(catalog: TableColumn[], columnId: string): string {
  return catalog.find((column) => column.id === columnId)?.label ?? columnId
}

export function ColumnViewMenu({
  catalog,
  viewConfig,
  views,
  activeViewId,
  entityType,
  onViewConfigChange,
  onActiveViewChange,
  onViewsReload,
}: ColumnViewMenuProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveScope, setSaveScope] = useState<TableViewScope>('personal')
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const activeView = views.find((view) => view.id === activeViewId)
  const isSystemDefault = activeViewId === SYSTEM_DEFAULT_VIEW_ID

  const orderedEntries = useMemo(() => {
    const merged = mergeViewConfigWithCatalog(catalog, viewConfig)
    return merged.columns.sort((a, b) => a.order - b.order)
  }, [catalog, viewConfig])

  function updateEntry(
    columnId: string,
    patch: Partial<TableViewColumnConfig>
  ) {
    const merged = mergeViewConfigWithCatalog(catalog, viewConfig)
    const nextColumns = merged.columns.map((entry) =>
      entry.id === columnId ? { ...entry, ...patch } : entry
    )
    onViewConfigChange({ columns: nextColumns })
  }

  function reorderColumns(sourceId: string, targetId: string) {
    if (sourceId === targetId) return

    const items = [...orderedEntries]
    const sourceIndex = items.findIndex((entry) => entry.id === sourceId)
    const targetIndex = items.findIndex((entry) => entry.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return

    const [moved] = items.splice(sourceIndex, 1)
    items.splice(targetIndex, 0, moved)

    onViewConfigChange({
      columns: items.map((entry, index) => ({ ...entry, order: index })),
    })
  }

  function handleSelectView(viewId: string) {
    onActiveViewChange(viewId)
    if (viewId === SYSTEM_DEFAULT_VIEW_ID) {
      onViewConfigChange(createDefaultViewConfig(catalog))
      setSaveName('')
      return
    }

    const view = views.find((item) => item.id === viewId)
    if (view) {
      onViewConfigChange(mergeViewConfigWithCatalog(catalog, view.config))
      setSaveName(view.name)
      setSaveScope(view.scope)
      setSaveAsDefault(view.is_default)
    }
  }

  async function handleSave() {
    if (!saveName.trim()) {
      toast({
        title: 'Name fehlt',
        description: 'Bitte einen Namen für die View eingeben.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: saveName.trim(),
        entity_type: entityType,
        scope: saveScope,
        config: mergeViewConfigWithCatalog(catalog, viewConfig),
        is_default: saveAsDefault,
      }

      if (!isSystemDefault && activeView && activeView.scope === saveScope) {
        const response = await authenticatedFetch(
          `/api/admin/table-views/${activeView.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: payload.name,
              config: payload.config,
              is_default: payload.is_default,
            }),
          }
        )
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Speichern fehlgeschlagen')
        }
        const data = await response.json()
        await onViewsReload()
        onActiveViewChange(data.view.id)
      } else {
        const response = await authenticatedFetch('/api/admin/table-views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Speichern fehlgeschlagen')
        }
        const data = await response.json()
        await onViewsReload()
        onActiveViewChange(data.view.id)
      }

      toast({
        title: 'Gespeichert',
        description:
          saveScope === 'global'
            ? 'Globale Spalten-View wurde gespeichert.'
            : 'Persönliche Spalten-View wurde gespeichert.',
      })
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'View konnte nicht gespeichert werden',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (isSystemDefault || !activeView) return

    setSaving(true)
    try {
      const response = await authenticatedFetch(
        `/api/admin/table-views/${activeView.id}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Löschen fehlgeschlagen')
      }

      await onViewsReload()
      handleSelectView(SYSTEM_DEFAULT_VIEW_ID)
      toast({
        title: 'Gelöscht',
        description: 'Die Spalten-View wurde entfernt.',
      })
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'View konnte nicht gelöscht werden',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={activeViewId} onValueChange={handleSelectView}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="View wählen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SYSTEM_DEFAULT_VIEW_ID}>Standard</SelectItem>
          {views.map((view) => (
            <SelectItem key={view.id} value={view.id}>
              {view.scope === 'global' ? 'Global: ' : 'Persönlich: '}
              {view.name}
              {view.is_default ? ' (Standard)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Columns3 className="h-4 w-4" />
            Spalten
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[420px] p-0">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-sage-900">
              Spalten anpassen
            </h3>
            <p className="mt-1 text-xs text-sage-600">
              Sichtbarkeit, Reihenfolge und Breite festlegen.
            </p>
          </div>

          <div className="max-h-[320px] overflow-y-auto px-2 py-2">
            {orderedEntries.map((entry) => (
              <div
                key={entry.id}
                draggable
                onDragStart={() => setDraggingId(entry.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingId) reorderColumns(draggingId, entry.id)
                  setDraggingId(null)
                }}
                onDragEnd={() => setDraggingId(null)}
                className={cn(
                  'mb-1 flex items-center gap-2 rounded-md border border-transparent px-2 py-2 hover:bg-sage-50',
                  draggingId === entry.id && 'border-sage-300 bg-sage-50'
                )}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-sage-400" />
                <Checkbox
                  checked={entry.visible}
                  onCheckedChange={(checked) =>
                    updateEntry(entry.id, { visible: checked === true })
                  }
                  disabled={entry.id === 'id'}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-sage-900">
                  {getColumnLabel(catalog, entry.id)}
                </span>
                <Input
                  type="number"
                  min={80}
                  max={500}
                  value={entry.width ?? ''}
                  onChange={(event) => {
                    const value = event.target.value
                    updateEntry(entry.id, {
                      width: value ? Number(value) : undefined,
                    })
                  }}
                  className="h-8 w-[72px] shrink-0"
                  placeholder="px"
                />
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t px-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="view-name">Name</Label>
              <Input
                id="view-name"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                placeholder="Meine Lead-Ansicht"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={saveScope === 'personal' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setSaveScope('personal')}
              >
                <User className="h-3.5 w-3.5" />
                Persönlich
              </Button>
              <Button
                type="button"
                variant={saveScope === 'global' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setSaveScope('global')}
              >
                <Globe className="h-3.5 w-3.5" />
                Global
              </Button>
            </div>

            <label className="flex items-center gap-2 text-sm text-sage-700">
              <Checkbox
                checked={saveAsDefault}
                onCheckedChange={(checked) =>
                  setSaveAsDefault(checked === true)
                }
              />
              Als Standard-View setzen
            </label>

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-3.5 w-3.5" />
                Speichern
              </Button>
              {!isSystemDefault && activeView && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
