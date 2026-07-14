'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2 } from 'lucide-react'
import type { PropertyFieldType } from '@/lib/types'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

interface AddColumnModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: 'lead' | 'customer'
  onColumnAdded?: () => void
}

const FIELD_TYPE_OPTIONS: { value: PropertyFieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'Single line text', icon: 'T' },
  { value: 'textarea', label: 'Long text', icon: '📝' },
  { value: 'number', label: 'Number', icon: '#' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'select', label: 'Select', icon: '▼' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑' },
]

export function AddColumnModal({ open, onOpenChange, entityType, onColumnAdded }: AddColumnModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    field_type: 'text' as PropertyFieldType,
    options: [] as string[],
    required: false,
    applies_to: [entityType] as ('lead' | 'customer')[],
  })
  const [newOption, setNewOption] = useState('')

  function resetForm() {
    setFormData({
      name: '',
      label: '',
      field_type: 'text',
      options: [],
      required: false,
      applies_to: [entityType],
    })
    setNewOption('')
  }

  function addOption() {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, newOption.trim()],
      }))
      setNewOption('')
    }
  }

  function removeOption(option: string) {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter(o => o !== option),
    }))
  }

  async function handleCreate() {
    if (!formData.label.trim()) {
      toast({
        title: 'Fehler',
        description: 'Label ist erforderlich',
        variant: 'destructive',
      })
      return
    }

    if (formData.field_type === 'select' && formData.options.length === 0) {
      toast({
        title: 'Fehler',
        description: 'Select-Felder benötigen mindestens eine Option',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Generiere Name aus Label wenn nicht angegeben
      const name = formData.name.trim() || formData.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

      const response = await authenticatedFetch('/api/admin/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          label: formData.label,
          field_type: formData.field_type,
          options: formData.options,
          required: formData.required,
          applies_to: formData.applies_to,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Erstellen')
      }

      toast({
        title: 'Erfolg',
        description: 'Eigenschaft erstellt',
      })

      resetForm()
      onOpenChange(false)
      if (onColumnAdded) {
        onColumnAdded()
      }
    } catch (error: any) {
      console.error('Error creating property:', error)
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Erstellen',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Field</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Field name (Optional)</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Wird automatisch generiert wenn leer"
            />
          </div>

          <div className="space-y-2">
            <Label>Label *</Label>
            <Input
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Anzeigename"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Search field type</Label>
            <div className="border rounded-lg p-2 max-h-64 overflow-y-auto">
              {FIELD_TYPE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`
                    flex items-center gap-3 p-3 rounded cursor-pointer transition-colors
                    ${formData.field_type === option.value ? 'bg-sage-100' : 'hover:bg-sage-50'}
                  `}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      field_type: option.value,
                      options: option.value === 'select' ? prev.options : [],
                    }))
                  }}
                >
                  <span className="text-xl w-8 text-center">{option.icon}</span>
                  <span>{option.label}</span>
                </div>
              ))}
            </div>
          </div>

          {formData.field_type === 'select' && (
            <div className="space-y-2">
              <Label>Optionen</Label>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addOption()
                    }
                  }}
                  placeholder="Option hinzufügen"
                />
                <Button type="button" onClick={addOption} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.options.map((option) => (
                  <div
                    key={option}
                    className="flex items-center gap-2 bg-sage-100 px-3 py-1 rounded-md"
                  >
                    <span>{option}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(option)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="required"
              checked={formData.required}
              onCheckedChange={(checked) => {
                setFormData(prev => ({ ...prev, required: checked === true }))
              }}
            />
            <Label htmlFor="required" className="cursor-pointer">Pflichtfeld</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Erstelle...' : 'Erstellen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

