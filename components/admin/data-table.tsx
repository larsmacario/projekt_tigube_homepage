'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { CalendarIcon, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { TableColumn } from '@/lib/table-columns'
import { AddColumnModal } from './add-column-modal'

interface DataTableProps {
  columns: TableColumn[]
  data: Record<string, any>[]
  entityType: 'lead' | 'customer'
  loading?: boolean
  onCellUpdate?: (rowId: string | number, columnId: string, value: any) => Promise<void>
  onAddColumn?: () => void
}

const MOBILE_CARD_PRIORITY: Record<'lead' | 'customer', string[]> = {
  lead: ['vorname', 'nachname', 'email', 'telefonnummer', 'status', 'lead_type'],
  customer: ['vorname', 'nachname', 'email', 'kundennummer', 'status', 'telefonnummer'],
}

function getMobileCardColumns(columns: TableColumn[], entityType: 'lead' | 'customer') {
  const priority = MOBILE_CARD_PRIORITY[entityType]
  const dataColumns = columns.filter((column) => column.fieldType !== 'id')
  const prioritized = priority
    .map((fieldName) => dataColumns.find((column) => column.fieldName === fieldName))
    .filter((column): column is TableColumn => Boolean(column))
  const remaining = dataColumns.filter(
    (column) => !prioritized.some((picked) => picked.id === column.id)
  )
  return [...prioritized, ...remaining].slice(0, 4)
}

export function DataTable({
  columns,
  data,
  entityType,
  loading = false,
  onCellUpdate,
  onAddColumn,
}: DataTableProps) {
  const { toast } = useToast()
  const [editingCell, setEditingCell] = useState<{ rowId: string | number; columnId: string } | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)

  function getCellValue(row: Record<string, any>, column: TableColumn): any {
    if (column.isProperty) {
      // Property Value aus row holen
      return row[column.id] || null
    }
    return row[column.fieldName] || null
  }


  function handleCellClick(rowId: string | number, columnId: string) {
    const column = columns.find(c => c.id === columnId)
    if (!column || column.fieldType === 'id' || column.fieldType === 'timestamp' || column.readOnly) return

    const row = data.find(r => String(r.id) === String(rowId))
    if (!row) return

    const currentValue = getCellValue(row, column)
    setEditingCell({ rowId, columnId })
    setEditValue(currentValue)
  }

  async function handleCellSave(valueOverride?: unknown) {
    if (!editingCell || !onCellUpdate) return

    const valueToSave = valueOverride !== undefined ? valueOverride : editValue

    try {
      await onCellUpdate(editingCell.rowId, editingCell.columnId, valueToSave)
      setEditingCell(null)
      setEditValue('')
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Speichern',
        variant: 'destructive',
      })
    }
  }

  function handleCellCancel() {
    setEditingCell(null)
    setEditValue('')
  }

  /** Festbreite-Spalte: Button (~4.6875rem) + Zell‑Padding (~1rem) → keine elastische #-Spalte */
  const ID_COL_TABLE_CLASS =
    '!w-[5.6875rem] min-w-[5.6875rem] max-w-[5.6875rem] shrink-0 whitespace-nowrap p-2 px-3 text-center align-middle box-border'

  function renderOpenColumnCell(row: Record<string, any>, rowIndex: number) {
    const path = entityType === 'lead' ? 'leads' : 'customers'
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          'relative mx-auto inline-flex h-9 w-[4.6875rem] shrink-0 items-center justify-center overflow-hidden border-sage-300',
          'bg-background px-2 font-normal text-sage-900 hover:bg-sage-50',
          'group/op'
        )}
        onClick={(e) => {
          e.stopPropagation()
          window.location.href = `/admin/${path}/${row.id}`
        }}
      >
        <span className="w-full tabular-nums text-center transition-opacity group-hover/op:opacity-0">
          {rowIndex}
        </span>
        <span
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center',
            'rounded-[inherit] bg-background text-xs font-semibold tracking-tight text-sage-900',
            'opacity-0 transition-opacity group-hover/op:opacity-100'
          )}
        >
          Öffnen
        </span>
      </Button>
    )
  }

  function renderCell(row: Record<string, any>, column: TableColumn) {
    const value = getCellValue(row, column)
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id

    if (isEditing) {
      return renderEditableCell(column, editValue, setEditValue, handleCellSave, handleCellCancel)
    }

    return renderDisplayCell(value, column)
  }

  function renderDisplayCell(value: any, column: TableColumn) {
    switch (column.fieldType) {
      case 'timestamp':
      case 'date':
        if (!value) return <span className="text-sage-400">-</span>
        try {
          const date = new Date(value)
          return format(date, 'dd.MM.yyyy HH:mm', { locale: de })
        } catch {
          return <span className="text-sage-400">-</span>
        }
      case 'checkbox':
        return value === true ? (
          <span className="text-green-600">✓</span>
        ) : (
          <span className="text-sage-400">-</span>
        )
      case 'status':
        return (
          <span className={cn(
            'px-2 py-1 rounded text-xs',
            value === 'new' && 'bg-blue-100 text-blue-800',
            value === 'contacted' && 'bg-yellow-100 text-yellow-800',
            value === 'converted' && 'bg-green-100 text-green-800',
            value === 'declined' && 'bg-red-100 text-red-800'
          )}>
            {value}
          </span>
        )
      case 'email_status':
        if (!value) return <span className="text-sage-400">-</span>
        return (
          <span className={cn(
            'px-2 py-1 rounded text-xs',
            value === 'sent' && 'bg-green-100 text-green-800',
            value === 'failed' && 'bg-red-100 text-red-800'
          )}>
            {value === 'sent' ? 'Gesendet' : value === 'failed' ? 'Fehlgeschlagen' : value}
          </span>
        )
      default:
        if (column.optionsMap && value) {
          return <span>{column.optionsMap[value] || value}</span>
        }
        return <span>{value || <span className="text-sage-400">-</span>}</span>
    }
  }

  function renderEditableCell(
    column: TableColumn,
    value: any,
    setValue: (val: any) => void,
    onSave: (valueOverride?: unknown) => void,
    onCancel: () => void
  ) {
    switch (column.fieldType) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave()
              if (e.key === 'Escape') onCancel()
            }}
            autoFocus
            className="h-8"
          />
        )
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel()
            }}
            autoFocus
            className="w-full h-20 px-2 py-1 border rounded text-sm"
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => setValue(e.target.value ? parseFloat(e.target.value) : null)}
            onBlur={onSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave()
              if (e.key === 'Escape') onCancel()
            }}
            autoFocus
            className="h-8"
          />
        )
      case 'date':
        const dateValue = value ? new Date(value) : undefined
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn('h-8 w-full justify-start text-left font-normal', !dateValue && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, 'dd.MM.yyyy', { locale: de }) : 'Datum wählen'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => {
                  if (date) {
                    const nextValue = date.toISOString().split('T')[0]
                    setValue(nextValue)
                    setTimeout(() => onSave(nextValue), 100)
                  }
                }}
                locale={de}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => {
              setValue(val)
              setTimeout(() => onSave(val), 100)
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Wählen" />
            </SelectTrigger>
            <SelectContent>
              {column.optionsMap ? (
                Object.entries(column.optionsMap).map(([optVal, optLabel]) => (
                  <SelectItem key={optVal} value={optVal}>
                    {optLabel}
                  </SelectItem>
                ))
              ) : (
                column.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )
      case 'checkbox':
        return (
          <Checkbox
            checked={value === true}
            onCheckedChange={(checked) => {
              const nextValue = checked === true
              setValue(nextValue)
              setTimeout(() => onSave(nextValue), 100)
            }}
          />
        )
      default:
        return <span>{value || '-'}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  const mobileColumns = getMobileCardColumns(columns, entityType)
  const detailPath = entityType === 'lead' ? 'leads' : 'customers'

  return (
    <div className="space-y-4">
      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {data.length === 0 ? (
          <div className="rounded-lg border border-sage-200 bg-white px-4 py-8 text-center text-sage-600">
            Keine Daten gefunden
          </div>
        ) : (
          data.map((row, index) => {
            const title =
              [row.vorname, row.nachname].filter(Boolean).join(' ') ||
              row.email ||
              row.kundennummer ||
              `Eintrag ${index + 1}`

            return (
              <Card key={row.id} className="border-sage-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sage-900 truncate">{title}</p>
                      {row.email && (
                        <p className="text-sm text-sage-600 truncate">{row.email}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-sage-300"
                      onClick={() => {
                        window.location.href = `/admin/${detailPath}/${row.id}`
                      }}
                    >
                      Öffnen
                    </Button>
                  </div>
                  <dl className="grid grid-cols-1 gap-2 text-sm">
                    {mobileColumns.map((column) => {
                      const value = getCellValue(row, column)
                      if (column.fieldName === 'vorname' || column.fieldName === 'nachname') {
                        return null
                      }
                      if (column.fieldName === 'email' && row.email) {
                        return null
                      }
                      return (
                        <div
                          key={column.id}
                          className="flex items-start justify-between gap-3 border-t border-sage-100 pt-2 first:border-t-0 first:pt-0"
                        >
                          <dt className="text-sage-500 shrink-0">{column.label}</dt>
                          <dd className="text-right text-sage-900 min-w-0 break-words">
                            {renderDisplayCell(value, column)}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-sage-50">
              <TableRow>
                 {columns.map((column) => (
                   <TableHead
                     key={column.id}
                     style={{
                       ...(column.fieldType !== 'id' && column.width !== undefined
                         ? { width: column.width, minWidth: column.width }
                         : {}),
                     }}
                     className={cn(
                       'sticky top-0 bg-sage-50 z-10',
                       column.fieldType === 'id' && ID_COL_TABLE_CLASS
                     )}
                   >
                     <span>{column.label}</span>
                   </TableHead>
                 ))}
                <TableHead className="sticky top-0 bg-sage-50 z-10 w-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setIsAddColumnOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center py-8 text-sage-600">
                    Keine Daten gefunden
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow key={row.id} className="hover:bg-sage-50/50">
                     {columns.map((column) => (
                       <TableCell
                         key={column.id}
                         className={cn(
                           column.fieldType === 'id' &&
                             cn(ID_COL_TABLE_CLASS),
                           column.fieldType !== 'id' &&
                             column.fieldType !== 'timestamp' &&
                             !column.readOnly &&
                             'cursor-pointer hover:bg-sage-100'
                         )}
                         onClick={() => {
                           if (column.fieldType === 'id') return
                           if (column.fieldType !== 'timestamp' && !column.readOnly) {
                             handleCellClick(row.id, column.id)
                           }
                         }}
                       >
                         {column.fieldType === 'id'
                           ? renderOpenColumnCell(row, index + 1)
                           : renderCell(row, column)}
                       </TableCell>
                     ))}
                    <TableCell></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AddColumnModal
        open={isAddColumnOpen}
        onOpenChange={setIsAddColumnOpen}
        entityType={entityType}
        onColumnAdded={onAddColumn}
      />
    </div>
  )
}

