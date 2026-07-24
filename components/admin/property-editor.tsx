'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertyDefinition, PropertyValue } from '@/lib/types'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { CollapsibleAdminCard } from '@/components/admin/collapsible-admin-card'

interface PropertyEditorProps {
  entityType: 'lead' | 'customer'
  entityId: string
  defaultExpanded?: boolean
}

export function PropertyEditor({ entityType, entityId, defaultExpanded = true }: PropertyEditorProps) {
  const { toast } = useToast()
  const [definitions, setDefinitions] = useState<PropertyDefinition[]>([])
  const [values, setValues] = useState<Record<string, PropertyValue>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadData()
  }, [entityType, entityId])

  async function loadData() {
    setLoading(true)
    try {
      // Lade Definitions für diesen Entity-Typ
      const defResponse = await authenticatedFetch(`/api/admin/properties?applies_to=${entityType}`)
      const defData = await defResponse.json()
      setDefinitions(defData.definitions || [])

      // Lade Values
      const valResponse = await authenticatedFetch(`/api/admin/properties/values?entity_type=${entityType}&entity_id=${entityId}`)
      const valData = await valResponse.json()
      
      // Konvertiere zu Record für einfachen Zugriff
      const valuesRecord: Record<string, PropertyValue> = {}
      ;(valData.values || []).forEach((val: PropertyValue) => {
        valuesRecord[val.property_definition_id] = val
      })
      setValues(valuesRecord)
    } catch (error) {
      console.error('Error loading properties:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden der Eigenschaften',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function saveValue(definitionId: string, value: any) {
    setSaving(prev => ({ ...prev, [definitionId]: true }))
    try {
      const response = await authenticatedFetch('/api/admin/properties/values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_definition_id: definitionId,
          entity_type: entityType,
          entity_id: entityId,
          value,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Speichern')
      }

      const data = await response.json()
      
      // Update local state
      setValues(prev => ({
        ...prev,
        [definitionId]: data.value,
      }))

      toast({
        title: 'Erfolg',
        description: 'Eigenschaft gespeichert',
      })
    } catch (error: any) {
      console.error('Error saving property value:', error)
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setSaving(prev => ({ ...prev, [definitionId]: false }))
    }
  }

  function getValue(definitionId: string): any {
    const value = values[definitionId]
    if (!value) return null

    // Hole Wert basierend auf Feldtyp
    if (value.value_text !== null) return value.value_text
    if (value.value_number !== null) return value.value_number
    if (value.value_date !== null) return value.value_date
    if (value.value_boolean !== null) return value.value_boolean
    return null
  }

  function renderField(definition: PropertyDefinition) {
    const currentValue = getValue(definition.id)
    const isSaving = saving[definition.id] || false

    switch (definition.field_type) {
      case 'text':
        return (
          <Input
            defaultValue={currentValue || ''}
            onBlur={(e) => {
              const newValue = e.target.value
              if (newValue !== currentValue) {
                saveValue(definition.id, newValue)
              }
            }}
            disabled={isSaving}
            placeholder={definition.required ? 'Pflichtfeld' : 'Optional'}
          />
        )

      case 'textarea':
        return (
          <Textarea
            defaultValue={currentValue || ''}
            onBlur={(e) => {
              const newValue = e.target.value
              if (newValue !== currentValue) {
                saveValue(definition.id, newValue)
              }
            }}
            disabled={isSaving}
            placeholder={definition.required ? 'Pflichtfeld' : 'Optional'}
            rows={4}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            key={definition.id}
            defaultValue={currentValue !== null && currentValue !== undefined ? currentValue : ''}
            onBlur={(e) => {
              const inputValue = e.target.value
              const newValue = inputValue ? parseFloat(inputValue) : null
              const oldValue = currentValue !== null && currentValue !== undefined ? currentValue : null
              if (newValue !== oldValue) {
                saveValue(definition.id, newValue)
              }
            }}
            disabled={isSaving}
            placeholder={definition.required ? 'Pflichtfeld' : 'Optional'}
          />
        )

      case 'date':
        const dateValue = currentValue ? new Date(currentValue) : undefined
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dateValue && 'text-muted-foreground'
                )}
                disabled={isSaving}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, 'dd.MM.yyyy', { locale: de }) : <span>Datum wählen</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => {
                  if (date) {
                    saveValue(definition.id, date.toISOString().split('T')[0])
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
            value={currentValue || ''}
            onValueChange={(newValue) => {
              saveValue(definition.id, newValue)
            }}
            disabled={isSaving}
          >
            <SelectTrigger>
              <SelectValue placeholder={definition.required ? 'Bitte wählen' : 'Optional'} />
            </SelectTrigger>
            <SelectContent>
              {definition.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`property-${definition.id}`}
              checked={currentValue === true}
              onCheckedChange={(checked) => {
                saveValue(definition.id, checked === true)
              }}
              disabled={isSaving}
            />
            <Label
              htmlFor={`property-${definition.id}`}
              className="text-sm font-normal cursor-pointer"
            >
              {currentValue ? 'Ja' : 'Nein'}
            </Label>
          </div>
        )

      default:
        return <div className="text-sm text-sage-600">Unbekannter Feldtyp</div>
    }
  }

  if (loading) {
    return (
      <CollapsibleAdminCard title="Eigenschaften" defaultExpanded={defaultExpanded}>
        <div className="text-center py-4 text-sage-600">Lade Eigenschaften...</div>
      </CollapsibleAdminCard>
    )
  }

  if (definitions.length === 0) {
    return (
      <CollapsibleAdminCard title="Eigenschaften" defaultExpanded={defaultExpanded}>
        <div className="text-center py-4 text-sage-600">
          Keine Eigenschaften definiert. Bitte erstellen Sie zuerst Eigenschaften im Verwaltungsbereich.
        </div>
      </CollapsibleAdminCard>
    )
  }

  return (
    <CollapsibleAdminCard title="Eigenschaften" defaultExpanded={defaultExpanded}>
      <div className="space-y-4">
        {definitions.map((definition) => (
          <div key={definition.id} className="space-y-2">
            <Label className="flex items-center gap-2">
              {definition.label}
              {definition.required && <span className="text-red-500">*</span>}
            </Label>
            {renderField(definition)}
            {saving[definition.id] && (
              <p className="text-xs text-sage-600">Speichere...</p>
            )}
          </div>
        ))}
      </div>
    </CollapsibleAdminCard>
  )
}

