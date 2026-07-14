'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import type { PropertyDefinition, PropertyFieldType } from '@/lib/types'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

export function PropertyDefinitionManager() {
  const { toast } = useToast()
  const [definitions, setDefinitions] = useState<PropertyDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    field_type: 'text' as PropertyFieldType,
    options: [] as string[],
    required: false,
    applies_to: ['lead', 'customer'] as ('lead' | 'customer')[],
    sort_order: 0,
  })
  const [newOption, setNewOption] = useState('')

  useEffect(() => {
    loadDefinitions()
  }, [])

  async function loadDefinitions() {
    setLoading(true)
    try {
      const response = await authenticatedFetch('/api/admin/properties')
      const data = await response.json()
      setDefinitions(data.definitions || [])
    } catch (error) {
      console.error('Error loading definitions:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden der Eigenschafts-Definitionen',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      label: '',
      field_type: 'text',
      options: [],
      required: false,
      applies_to: ['lead', 'customer'],
      sort_order: 0,
    })
    setNewOption('')
    setEditingId(null)
  }

  function openEditDialog(definition: PropertyDefinition) {
    setFormData({
      name: definition.name,
      label: definition.label,
      field_type: definition.field_type,
      options: definition.options || [],
      required: definition.required,
      applies_to: definition.applies_to,
      sort_order: definition.sort_order,
    })
    setEditingId(definition.id)
    setIsDialogOpen(true)
  }

  function openCreateDialog() {
    resetForm()
    setIsDialogOpen(true)
  }

  async function saveDefinition() {
    try {
      // Validierung
      if (!formData.name || !formData.label) {
        toast({
          title: 'Fehler',
          description: 'Name und Label sind erforderlich',
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

      const url = editingId
        ? `/api/admin/properties/${editingId}`
        : '/api/admin/properties'
      
      const method = editingId ? 'PUT' : 'POST'

      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Speichern')
      }

      toast({
        title: 'Erfolg',
        description: editingId ? 'Eigenschaft aktualisiert' : 'Eigenschaft erstellt',
      })

      setIsDialogOpen(false)
      resetForm()
      loadDefinitions()
    } catch (error: any) {
      console.error('Error saving definition:', error)
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Speichern',
        variant: 'destructive',
      })
    }
  }

  async function deleteDefinition(id: string) {
    try {
      const response = await authenticatedFetch(`/api/admin/properties/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Löschen')
      }

      toast({
        title: 'Erfolg',
        description: 'Eigenschaft gelöscht',
      })

      loadDefinitions()
    } catch (error: any) {
      console.error('Error deleting definition:', error)
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Löschen',
        variant: 'destructive',
      })
    }
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

  function toggleAppliesTo(type: 'lead' | 'customer') {
    setFormData(prev => {
      const current = prev.applies_to
      if (current.includes(type)) {
        // Entfernen, aber mindestens einer muss bleiben
        if (current.length === 1) {
          toast({
            title: 'Hinweis',
            description: 'Mindestens ein Entity-Typ muss ausgewählt sein',
            variant: 'default',
          })
          return prev
        }
        return { ...prev, applies_to: current.filter(t => t !== type) }
      } else {
        return { ...prev, applies_to: [...current, type] }
      }
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eigenschafts-Definitionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-sage-600">Lade Definitionen...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Eigenschafts-Definitionen</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Eigenschaft
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Eigenschaft bearbeiten' : 'Neue Eigenschaft erstellen'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name (technisch, eindeutig)</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="z.B. lieblingsfutter"
                        disabled={!!editingId}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Label (Anzeigename)</Label>
                      <Input
                        value={formData.label}
                        onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="z.B. Lieblingsfutter"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Feldtyp</Label>
                    <Select
                      value={formData.field_type}
                      onValueChange={(value) => {
                        setFormData(prev => ({
                          ...prev,
                          field_type: value as PropertyFieldType,
                          options: value === 'select' ? prev.options : [],
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="number">Zahl</SelectItem>
                        <SelectItem value="date">Datum</SelectItem>
                        <SelectItem value="select">Auswahl (Dropdown)</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                      </SelectContent>
                    </Select>
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
                          Hinzufügen
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

                  <div className="space-y-2">
                    <Label>Gilt für</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="applies-lead"
                          checked={formData.applies_to.includes('lead')}
                          onCheckedChange={() => toggleAppliesTo('lead')}
                        />
                        <Label htmlFor="applies-lead" className="cursor-pointer">Leads</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="applies-customer"
                          checked={formData.applies_to.includes('customer')}
                          onCheckedChange={() => toggleAppliesTo('customer')}
                        />
                        <Label htmlFor="applies-customer" className="cursor-pointer">Kunden</Label>
                      </div>
                    </div>
                  </div>

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

                  <div className="space-y-2">
                    <Label>Sortierreihenfolge</Label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button onClick={saveDefinition}>
                      {editingId ? 'Aktualisieren' : 'Erstellen'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {definitions.length === 0 ? (
            <div className="text-center py-8 text-sage-600">
              Keine Eigenschafts-Definitionen vorhanden. Erstellen Sie eine neue Eigenschaft.
            </div>
          ) : (
            <div className="space-y-2">
              {definitions.map((definition) => (
                <div
                  key={definition.id}
                  className="flex items-center justify-between p-4 border border-sage-200 rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <GripVertical className="h-5 w-5 text-sage-400" />
                    <div className="flex-1">
                      <div className="font-medium">{definition.label}</div>
                      <div className="text-sm text-sage-600">
                        {definition.name} • {definition.field_type}
                        {definition.required && ' • Pflichtfeld'}
                        {definition.applies_to.length === 2
                          ? ' • Leads & Kunden'
                          : definition.applies_to.includes('lead')
                          ? ' • Nur Leads'
                          : ' • Nur Kunden'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(definition)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eigenschaft löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Möchten Sie die Eigenschaft "{definition.label}" wirklich löschen?
                            Alle zugehörigen Werte werden ebenfalls gelöscht.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteDefinition(definition.id)}>
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

