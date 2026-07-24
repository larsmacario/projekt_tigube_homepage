'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2 } from 'lucide-react'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import {
  emptyPriceOverrideForm,
  formToOverrideRow,
  GroupPriceOverrideEditorRow,
  overrideRowToForm,
  type PriceOverrideFormState,
} from '@/components/admin/price-override-editor'
import type { PriceOverrideRow } from '@/lib/price-override'

interface Price {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number | null
  price_type: 'fixed' | 'percentage' | 'per_unit' | 'text'
  unit: string | null
  note: string | null
  sort_order: number
}

interface PriceCategory {
  id: string
  name: string
  description: string | null
  service_type: 'hundepension' | 'katzenbetreuung' | 'all'
  sort_order: number
  created_at?: string
  updated_at?: string
}

interface CustomerGroup {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export default function PricesPage() {
  const [prices, setPrices] = useState<Price[]>([])
  const [categories, setCategories] = useState<PriceCategory[]>([])
  const [groups, setGroups] = useState<CustomerGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [groupPriceForms, setGroupPriceForms] = useState<Record<string, PriceOverrideFormState>>({})
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingGroupPrices, setSavingGroupPrices] = useState(false)
  const [savingCategories, setSavingCategories] = useState(false)
  
  // Group creation form
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Category creation form
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newCatServiceType, setNewCatServiceType] = useState<'hundepension' | 'katzenbetreuung' | 'all'>('hundepension')
  const [newCatSortOrder, setNewCatSortOrder] = useState<number>(0)
  const [creatingCategory, setCreatingCategory] = useState(false)

  // Price creation form
  const [addingPriceToCategoryId, setAddingPriceToCategoryId] = useState<string | null>(null)
  const [newPriceName, setNewPriceName] = useState('')
  const [newPriceDesc, setNewPriceDesc] = useState('')
  const [newPriceVal, setNewPriceVal] = useState('')
  const [newPriceType, setNewPriceType] = useState<'fixed' | 'percentage' | 'per_unit' | 'text'>('fixed')
  const [newPriceUnit, setNewPriceUnit] = useState('')
  const [newPriceNote, setNewPriceNote] = useState('')
  const [newPriceSortOrder, setNewPriceSortOrder] = useState<number>(0)

  const { toast } = useToast()

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupPrices(selectedGroupId)
    } else {
      setGroupPriceForms({})
    }
  }, [selectedGroupId])

  async function loadAllData() {
    setLoading(true)
    try {
      const [pricesRes, groupsRes] = await Promise.all([
        authenticatedFetch('/api/admin/prices'),
        authenticatedFetch('/api/admin/customer-groups'),
      ])
      
      const pricesData = await pricesRes.json()
      setPrices(pricesData.prices || [])
      setCategories(pricesData.categories || [])
      
      const groupsData = await groupsRes.json()
      const loadedGroups = groupsData.groups || []
      setGroups(loadedGroups)
      
      if (loadedGroups.length > 0) {
        setSelectedGroupId(loadedGroups[0].id)
      }
    } catch (error) {
      console.error('Error loading prices page data:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden der Preisdaten',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadGroupPrices(groupId: string) {
    try {
      const response = await authenticatedFetch(`/api/admin/group-prices?group_id=${groupId}`)
      const data = await response.json()
      
      const formsMap: Record<string, PriceOverrideFormState> = {}
      if (data.overrides) {
        data.overrides.forEach((o: PriceOverrideRow) => {
          formsMap[o.price_id] = overrideRowToForm(o)
        })
      }
      setGroupPriceForms(formsMap)
    } catch (error) {
      console.error('Error loading group prices:', error)
    }
  }

  async function handleSaveDefaultPrices() {
    setSaving(true)
    try {
      const response = await authenticatedFetch('/api/admin/prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices }),
      })

      if (response.ok) {
        toast({
          title: 'Erfolg',
          description: 'Preise erfolgreich gespeichert!',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Speichern',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving prices:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return
    setCreatingGroup(true)
    try {
      const response = await authenticatedFetch('/api/admin/customer-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc }),
      })

      if (response.ok) {
        const data = await response.json()
        const newGroup = data.group
        setGroups([...groups, newGroup])
        setSelectedGroupId(newGroup.id)
        setNewGroupName('')
        setNewGroupDesc('')
        toast({
          title: 'Erfolg',
          description: 'Kundengruppe erfolgreich erstellt',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Erstellen der Gruppe',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating group:', error)
    } finally {
      setCreatingGroup(false)
    }
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm('Möchtest du diese Kundengruppe wirklich löschen? Alle Verknüpfungen und Gruppenpreise gehen verloren.')) return
    try {
      const response = await authenticatedFetch(`/api/admin/customer-groups/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const updatedGroups = groups.filter(g => g.id !== id)
        setGroups(updatedGroups)
        if (selectedGroupId === id) {
          setSelectedGroupId(updatedGroups[0]?.id || '')
        }
        toast({
          title: 'Erfolg',
          description: 'Kundengruppe erfolgreich gelöscht',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Löschen der Gruppe',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting group:', error)
    }
  }

  async function handleSaveGroupPrices() {
    if (!selectedGroupId) return
    setSavingGroupPrices(true)
    try {
      const overrides = Object.entries(groupPriceForms)
        .map(([price_id, form]) => formToOverrideRow(price_id, form))
        .filter(Boolean)

      const response = await authenticatedFetch('/api/admin/group-prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroupId,
          overrides,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Erfolg',
          description: 'Gruppenpreise erfolgreich gespeichert!',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Speichern',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving group prices:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setSavingGroupPrices(false)
    }
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return
    setCreatingCategory(true)
    try {
      const response = await authenticatedFetch('/api/admin/price-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          description: newCatDesc,
          service_type: newCatServiceType,
          sort_order: newCatSortOrder
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCategories([...categories, data.category].sort((a, b) => a.sort_order - b.sort_order))
        setNewCatName('')
        setNewCatDesc('')
        setNewCatSortOrder(0)
        toast({
          title: 'Erfolg',
          description: 'Preiskategorie erfolgreich erstellt'
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Erstellen der Kategorie',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error creating category:', error)
    } finally {
      setCreatingCategory(false)
    }
  }

  async function handleSaveCategories() {
    setSavingCategories(true)
    try {
      const updates = await Promise.all(
        categories.map(c => 
          authenticatedFetch(`/api/admin/price-categories/${c.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c)
          })
        )
      )
      const failed = updates.filter(r => !r.ok)
      if (failed.length > 0) {
        throw new Error('Einige Kategorien konnten nicht gespeichert werden')
      }
      
      // Sortiere Kategorien neu
      setCategories([...categories].sort((a, b) => a.sort_order - b.sort_order))
      
      toast({
        title: 'Erfolg',
        description: 'Preiskategorien erfolgreich gespeichert!'
      })
    } catch (error: any) {
      console.error('Error saving categories:', error)
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Speichern der Kategorien',
        variant: 'destructive'
      })
    } finally {
      setSavingCategories(false)
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Möchtest du diese Kategorie wirklich löschen? Alle zugeordneten Preise werden ebenfalls gelöscht.')) return
    try {
      const response = await authenticatedFetch(`/api/admin/price-categories/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCategories(categories.filter(c => c.id !== id))
        setPrices(prices.filter(p => p.category_id !== id))
        toast({
          title: 'Erfolg',
          description: 'Preiskategorie erfolgreich gelöscht'
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Löschen der Kategorie',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  // Price Creation Logic
  function resetNewPriceForm() {
    setNewPriceName('')
    setNewPriceDesc('')
    setNewPriceVal('')
    setNewPriceType('fixed')
    setNewPriceUnit('')
    setNewPriceNote('')
    setNewPriceSortOrder(0)
  }

  async function handleCreatePrice(categoryId: string) {
    if (!newPriceName.trim()) return
    try {
      const response = await authenticatedFetch('/api/admin/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPriceName,
          description: newPriceDesc || null,
          price: newPriceType === 'text' ? null : (newPriceVal ? parseFloat(newPriceVal) : null),
          price_type: newPriceType,
          unit: newPriceType === 'text' ? null : (newPriceUnit || null),
          note: newPriceNote || null,
          sort_order: newPriceSortOrder,
          category_id: categoryId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPrices([...prices, data.price].sort((a, b) => a.sort_order - b.sort_order))
        setAddingPriceToCategoryId(null)
        resetNewPriceForm()
        toast({
          title: 'Erfolg',
          description: 'Preis erfolgreich hinzugefügt'
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Hinzufügen des Preises',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error creating price:', error)
    }
  }

  async function handleDeletePrice(id: string) {
    if (!confirm('Möchtest du diesen Preis wirklich löschen?')) return
    try {
      const response = await authenticatedFetch(`/api/admin/prices/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setPrices(prices.filter(p => p.id !== id))
        toast({
          title: 'Erfolg',
          description: 'Preis erfolgreich gelöscht'
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Löschen des Preises',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error deleting price:', error)
    }
  }

  function updatePrice(id: string, field: keyof Price, value: any) {
    setPrices(prices.map(price => 
      price.id === id ? { ...price, [field]: value } : price
    ))
  }

  function updateCategoryState(id: string, field: keyof PriceCategory, value: any) {
    setCategories(categories.map(cat =>
      cat.id === id ? { ...cat, [field]: value } : cat
    ))
  }

  function updateGroupPriceForm(priceId: string, next: PriceOverrideFormState) {
    setGroupPriceForms(prev => {
      const isEmpty =
        next.price === '' && next.discount_type === '' && next.discount_value === ''
      if (isEmpty) {
        const updated = { ...prev }
        delete updated[priceId]
        return updated
      }
      return { ...prev, [priceId]: next }
    })
  }

  function getGroupPriceForm(priceId: string): PriceOverrideFormState {
    return groupPriceForms[priceId] ?? emptyPriceOverrideForm()
  }

  function formatPrice(price: Price): string {
    if (price.price_type === 'text') {
      return price.description || ''
    }
    
    if (price.price === null) return ''
    
    if (price.price_type === 'percentage') {
      return `+${price.price}%${price.unit ? ` ${price.unit}` : ''}`
    }
    
    if (price.price_type === 'per_unit') {
      return `${price.price.toFixed(2).replace('.', ',')}€${price.unit ? ` ${price.unit}` : ''}`
    }
    
    return `${price.price.toFixed(2).replace('.', ',')}€${price.unit ? ` ${price.unit}` : ''}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900 font-sans tracking-tight">Preise & Gruppen verwalten</h1>
        <p className="mt-2 text-sage-600">
          Passen Sie Standardpreise an oder erstellen Sie Kundengruppen mit benutzerdefinierten Preisnachlässen.
        </p>
      </div>

      <Tabs defaultValue="default" className="w-full">
        <TabsList className="bg-sage-100/60 p-1 rounded-lg border border-sage-200">
          <TabsTrigger value="default" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-sage-900 data-[state=active]:shadow-sm">
            Standard-Preise
          </TabsTrigger>
          <TabsTrigger value="groups" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-sage-900 data-[state=active]:shadow-sm">
            Kundengruppen & Gruppenpreise
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-sage-900 data-[state=active]:shadow-sm">
            Preiskategorien verwalten
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Standard-Preise */}
        <TabsContent value="default" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Button
              onClick={handleSaveDefaultPrices}
              disabled={saving}
              className="bg-sage-600 hover:bg-sage-700"
            >
              {saving ? 'Wird gespeichert...' : 'Alle Preise speichern'}
            </Button>
          </div>

          {categories.map((category) => {
            const categoryPrices = prices.filter(p => p.category_id === category.id)

            return (
              <Card key={category.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>{category.name}</CardTitle>
                    {category.description && (
                      <CardDescription>{category.description}</CardDescription>
                    )}
                    <span className="inline-block w-fit mt-1 px-2 py-0.5 text-xs rounded bg-sage-100 text-sage-800 capitalize font-medium">
                      Dienst: {category.service_type === 'all' ? 'Hund & Katze' : category.service_type}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (addingPriceToCategoryId === category.id) {
                        setAddingPriceToCategoryId(null)
                      } else {
                        setAddingPriceToCategoryId(category.id)
                        resetNewPriceForm()
                      }
                    }}
                    className="border-sage-300 text-sage-700 hover:bg-sage-50"
                  >
                    {addingPriceToCategoryId === category.id ? 'Abbrechen' : '+ Preis hinzufügen'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addingPriceToCategoryId === category.id && (
                    <div className="p-4 border border-dashed border-sage-300 rounded-lg space-y-3 bg-sage-50/40 mb-4">
                      <h4 className="font-semibold text-sage-900 text-sm">Neuen Preis hinzufügen</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <Label htmlFor="new-price-name">Name *</Label>
                          <Input
                            id="new-price-name"
                            value={newPriceName}
                            onChange={(e) => setNewPriceName(e.target.value)}
                            placeholder="z.B. Spezialfutter"
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-price-type">Preis-Typ *</Label>
                          <Select
                            value={newPriceType}
                            onValueChange={(val: any) => setNewPriceType(val)}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Festpreis</SelectItem>
                              <SelectItem value="percentage">Prozent</SelectItem>
                              <SelectItem value="per_unit">Pro Einheit</SelectItem>
                              <SelectItem value="text">Nur Text</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {newPriceType !== 'text' && (
                          <div>
                            <Label htmlFor="new-price-val">Preis (€ / %)</Label>
                            <Input
                              id="new-price-val"
                              type="number"
                              step="0.01"
                              value={newPriceVal}
                              onChange={(e) => setNewPriceVal(e.target.value)}
                              placeholder="0,00"
                              className="bg-white"
                            />
                          </div>
                        )}
                        {newPriceType !== 'text' && (
                          <div>
                            <Label htmlFor="new-price-unit">Einheit</Label>
                            <Input
                              id="new-price-unit"
                              value={newPriceUnit}
                              onChange={(e) => setNewPriceUnit(e.target.value)}
                              placeholder="z.B. pro Tag"
                              className="bg-white"
                            />
                          </div>
                        )}
                        <div>
                          <Label htmlFor="new-price-sort">Sortierung</Label>
                          <Input
                            id="new-price-sort"
                            type="number"
                            value={newPriceSortOrder}
                            onChange={(e) => setNewPriceSortOrder(parseInt(e.target.value) || 0)}
                            className="bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="new-price-desc">Beschreibung</Label>
                        <Textarea
                          id="new-price-desc"
                          value={newPriceDesc}
                          onChange={(e) => setNewPriceDesc(e.target.value)}
                          placeholder="Optionale Beschreibung"
                          rows={2}
                          className="bg-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="new-price-note">Hinweis</Label>
                        <Input
                          id="new-price-note"
                          value={newPriceNote}
                          onChange={(e) => setNewPriceNote(e.target.value)}
                          placeholder="Zusätzlicher Hinweis"
                          className="bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAddingPriceToCategoryId(null)}
                        >
                          Abbrechen
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCreatePrice(category.id)}
                          className="bg-sage-600 hover:bg-sage-700"
                          disabled={!newPriceName.trim()}
                        >
                          Preis hinzufügen
                        </Button>
                      </div>
                    </div>
                  )}

                  {categoryPrices.length === 0 ? (
                    <p className="text-sm text-sage-500 italic py-2">Keine Preise in dieser Kategorie vorhanden.</p>
                  ) : (
                    <div className="space-y-4">
                      {categoryPrices.map((price) => (
                        <div key={price.id} className="p-4 border border-sage-200 rounded-lg space-y-3 bg-sage-50/20">
                          <div className="flex justify-between items-center pb-2 border-b border-sage-100">
                            <span className="text-xs font-semibold text-sage-500 italic">Preis-ID: {price.id.substring(0, 8)}...</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePrice(price.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <Label htmlFor={`name-${price.id}`}>Name</Label>
                              <Input
                                id={`name-${price.id}`}
                                value={price.name}
                                onChange={(e) => updatePrice(price.id, 'name', e.target.value)}
                                className="bg-white"
                              />
                            </div>
                            {price.price_type !== 'text' ? (
                              <div>
                                <Label htmlFor={`price-${price.id}`}>Preis</Label>
                                <Input
                                  id={`price-${price.id}`}
                                  type="number"
                                  step="0.01"
                                  value={price.price || ''}
                                  onChange={(e) => updatePrice(price.id, 'price', e.target.value ? parseFloat(e.target.value) : null)}
                                  className="bg-white"
                                />
                              </div>
                            ) : (
                              <div className="flex items-end pb-2">
                                <span className="text-sm text-sage-500 italic">Textbasierter Preis</span>
                              </div>
                            )}
                          </div>
                          
                          {price.description !== null && (
                            <div>
                              <Label htmlFor={`description-${price.id}`}>Beschreibung</Label>
                              <Textarea
                                id={`description-${price.id}`}
                                value={price.description || ''}
                                onChange={(e) => updatePrice(price.id, 'description', e.target.value)}
                                rows={2}
                                className="bg-white"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label htmlFor={`price_type-${price.id}`}>Preis-Typ</Label>
                              <Select
                                value={price.price_type}
                                onValueChange={(value) => updatePrice(price.id, 'price_type', value)}
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed">Festpreis</SelectItem>
                                  <SelectItem value="percentage">Prozent</SelectItem>
                                  <SelectItem value="per_unit">Pro Einheit</SelectItem>
                                  <SelectItem value="text">Nur Text</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {price.price_type !== 'text' && (
                              <div>
                                <Label htmlFor={`unit-${price.id}`}>Einheit</Label>
                                <Input
                                  id={`unit-${price.id}`}
                                  value={price.unit || ''}
                                  onChange={(e) => updatePrice(price.id, 'unit', e.target.value)}
                                  placeholder="z.B. pro Nacht, pro Gabe"
                                  className="bg-white"
                                />
                              </div>
                            )}
                            <div>
                              <Label htmlFor={`category_id-${price.id}`}>Kategorie</Label>
                              <Select
                                value={price.category_id}
                                onValueChange={(value) => updatePrice(price.id, 'category_id', value)}
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                  </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor={`sort_order-${price.id}`}>Sortierung</Label>
                              <Input
                                id={`sort_order-${price.id}`}
                                type="number"
                                value={price.sort_order}
                                onChange={(e) => updatePrice(price.id, 'sort_order', parseInt(e.target.value) || 0)}
                                className="bg-white"
                              />
                            </div>
                          </div>

                          {price.note !== null && (
                            <div>
                              <Label htmlFor={`note-${price.id}`}>Hinweis</Label>
                              <Input
                                id={`note-${price.id}`}
                                value={price.note || ''}
                                onChange={(e) => updatePrice(price.id, 'note', e.target.value)}
                                className="bg-white"
                              />
                            </div>
                          )}

                          <div className="text-sm text-sage-600 pt-2 border-t border-dashed">
                            <strong>Vorschau:</strong> {formatPrice(price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Tab 2: Kundengruppen & Gruppenpreise */}
        <TabsContent value="groups" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Linke Spalte: Gruppenverwaltung */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Neue Gruppe erstellen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Name der Gruppe</Label>
                  <Input
                    id="group-name"
                    placeholder="z.B. Premium, Tierheim"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-desc">Beschreibung</Label>
                  <Textarea
                    id="group-desc"
                    placeholder="Optionale Beschreibung der Rabattgruppe"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    rows={2}
                    className="bg-white"
                  />
                </div>
                <Button
                  onClick={handleCreateGroup}
                  disabled={creatingGroup || !newGroupName.trim()}
                  className="w-full bg-sage-600 hover:bg-sage-700 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Gruppe erstellen
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bestehende Gruppen</CardTitle>
              </CardHeader>
              <CardContent>
                {groups.length === 0 ? (
                  <p className="text-sm text-sage-600 text-center py-4">Keine Gruppen angelegt.</p>
                ) : (
                  <div className="space-y-2">
                    {groups.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedGroupId === g.id
                            ? 'border-sage-600 bg-sage-50/50 shadow-sm'
                            : 'border-sage-200 hover:bg-sage-50/20'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-semibold text-sage-900 truncate">{g.name}</p>
                          {g.description && (
                            <p className="text-xs text-sage-600 truncate">{g.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteGroup(g.id)
                          }}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rechte Spalte: Preise für die ausgewählte Gruppe */}
          <div className="lg:col-span-2">
            {selectedGroupId ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>
                      Preise für Gruppe: {groups.find(g => g.id === selectedGroupId)?.name}
                    </CardTitle>
                  </div>
                  <Button
                    onClick={handleSaveGroupPrices}
                    disabled={savingGroupPrices}
                    className="bg-sage-600 hover:bg-sage-700"
                  >
                    {savingGroupPrices ? 'Wird gespeichert...' : 'Gruppenpreise speichern'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-sage-600">
                    Optional Sonderpreis und/oder Rabatt pro Posten für diese Gruppe. Leere Felder = Standardpreis.
                  </p>
                  
                  {categories.map((category) => {
                    const categoryPrices = prices.filter(p => p.category_id === category.id && p.price_type !== 'text')
                    if (categoryPrices.length === 0) return null

                    return (
                      <div key={category.id} className="space-y-3">
                        <h3 className="font-semibold text-sage-900 border-b pb-1">
                          {category.name}
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {categoryPrices.map((price) => (
                            <GroupPriceOverrideEditorRow
                              key={price.id}
                              catalogPrice={price}
                              form={getGroupPriceForm(price.id)}
                              onChange={(next) => updateGroupPriceForm(price.id, next)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed rounded-lg p-12 text-sage-600 bg-sage-50/20">
                Wähle links eine Gruppe aus, um deren Preise zu bearbeiten, oder erstelle eine neue.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Preiskategorien verwalten */}
        <TabsContent value="categories" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Linke Spalte: Neue Kategorie */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Neue Preiskategorie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name">Kategorie Name</Label>
                  <Input
                    id="cat-name"
                    placeholder="z.B. Hundepension Futter"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-desc">Beschreibung</Label>
                  <Textarea
                    id="cat-desc"
                    placeholder="Beschreibung der Kategorie"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    rows={2}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-service">Zugeordneter Dienst</Label>
                  <Select
                    value={newCatServiceType}
                    onValueChange={(val: any) => setNewCatServiceType(val)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hundepension">Hundepension</SelectItem>
                      <SelectItem value="katzenbetreuung">Katzenbetreuung</SelectItem>
                      <SelectItem value="all">Sowohl als auch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-sort">Sortierreihenfolge</Label>
                  <Input
                    id="cat-sort"
                    type="number"
                    value={newCatSortOrder}
                    onChange={(e) => setNewCatSortOrder(parseInt(e.target.value) || 0)}
                    className="bg-white"
                  />
                </div>
                <Button
                  onClick={handleCreateCategory}
                  disabled={creatingCategory || !newCatName.trim()}
                  className="w-full bg-sage-600 hover:bg-sage-700 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Kategorie erstellen
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Rechte Spalte: Kategorienliste */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Bestehende Preiskategorien</CardTitle>
                </div>
                <Button
                  onClick={handleSaveCategories}
                  disabled={savingCategories}
                  className="bg-sage-600 hover:bg-sage-700"
                >
                  {savingCategories ? 'Wird gespeichert...' : 'Kategorien speichern'}
                </Button>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <p className="text-sm text-sage-600 text-center py-4">Keine Kategorien vorhanden.</p>
                ) : (
                  <div className="space-y-4">
                    {categories.map((c) => (
                      <div key={c.id} className="p-4 border border-sage-200 rounded-lg space-y-3 bg-sage-50/10">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <Input
                              value={c.name}
                              onChange={(e) => updateCategoryState(c.id, 'name', e.target.value)}
                              className="font-semibold text-sage-900 bg-white"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(c.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div>
                          <Textarea
                            value={c.description || ''}
                            onChange={(e) => updateCategoryState(c.id, 'description', e.target.value)}
                            placeholder="Beschreibung"
                            rows={1}
                            className="bg-white text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Dienst</Label>
                            <Select
                              value={c.service_type}
                              onValueChange={(val: any) => updateCategoryState(c.id, 'service_type', val)}
                            >
                              <SelectTrigger className="bg-white h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hundepension">Hundepension</SelectItem>
                                <SelectItem value="katzenbetreuung">Katzenbetreuung</SelectItem>
                                <SelectItem value="all">Beides</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Sortierung</Label>
                            <Input
                              type="number"
                              value={c.sort_order}
                              onChange={(e) => updateCategoryState(c.id, 'sort_order', parseInt(e.target.value) || 0)}
                              className="bg-white h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
