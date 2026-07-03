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
import Link from 'next/link'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
    if (!column || column.fieldType === 'id' || column.fieldType === 'timestamp') return

    const row = data.find(r => String(r.id) === String(rowId))
    if (!row) return

    const currentValue = getCellValue(row, column)
    setEditingCell({ rowId, columnId })
    setEditValue(currentValue)
  }

  async function handleCellSave() {
    if (!editingCell || !onCellUpdate) return

    try {
      await onCellUpdate(editingCell.rowId, editingCell.columnId, editValue)
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
    onSave: () => void,
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
                    setValue(date.toISOString().split('T')[0])
                    setTimeout(onSave, 100)
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
          <Select value={value || ''} onValueChange={(val) => { setValue(val); setTimeout(onSave, 100) }}>
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
              setValue(checked === true)
              setTimeout(onSave, 100)
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

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
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
                             'cursor-pointer hover:bg-sage-100'
                         )}
                         onClick={() => {
                           if (column.fieldType === 'id') return
                           if (column.fieldType !== 'timestamp') {
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

