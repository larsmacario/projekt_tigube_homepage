'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { CalendarIcon, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { CapacitySetting, CapacityOverride } from '@/lib/types'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

export default function CapacityPage() {
  const [settings, setSettings] = useState<CapacitySetting[]>([])
  const [overrides, setOverrides] = useState<CapacityOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    service_type: '' as string | null,
    default_capacity: '',
  })

  const [overrideForm, setOverrideForm] = useState({
    date: undefined as Date | undefined,
    service_type: '' as string | null,
    capacity: '',
    reason: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [settingsRes, overridesRes] = await Promise.all([
        authenticatedFetch('/api/admin/capacity'),
        authenticatedFetch('/api/admin/capacity/overrides'),
      ])

      const [settingsData, overridesData] = await Promise.all([
        settingsRes.json(),
        overridesRes.json(),
      ])

      setSettings(settingsData.settings || [])
      setOverrides(overridesData.overrides || [])
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

  async function handleSaveSettings() {
    try {
      // Speichere alle aktuellen Settings
      const settingsToSave = settings.map(s => ({
        service_type: s.service_type,
        default_capacity: s.default_capacity,
      }))

      // Stelle sicher, dass alle benötigten Settings vorhanden sind
      const requiredTypes = [null, 'hundepension', 'katzenbetreuung', 'tagesbetreuung']
      requiredTypes.forEach(type => {
        if (!settingsToSave.find(s => s.service_type === type)) {
          settingsToSave.push({
            service_type: type,
            default_capacity: 0,
          })
        }
      })

      const response = await authenticatedFetch('/api/admin/capacity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Speichern')
      }

      const data = await response.json()
      setSettings(data.settings)
      toast({
        title: 'Erfolg',
        description: 'Kapazitäten wurden gespeichert',
      })
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Speichern',
        variant: 'destructive',
      })
    }
  }

  async function handleAddOverride() {
    if (!overrideForm.date || overrideForm.capacity === '') {
      toast({
        title: 'Fehler',
        description: 'Bitte fülle alle Pflichtfelder aus',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await authenticatedFetch('/api/admin/capacity/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: overrideForm.date.toISOString().split('T')[0],
          service_type: overrideForm.service_type || null,
          capacity: parseInt(overrideForm.capacity),
          reason: overrideForm.reason || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Erstellen')
      }

      const data = await response.json()
      setOverrides([...overrides, data.override])
      setOverrideForm({
        date: undefined,
        service_type: '' as string | null,
        capacity: '',
        reason: '',
      })
      setIsDialogOpen(false)
      toast({
        title: 'Erfolg',
        description: 'Override wurde erstellt',
      })
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Erstellen',
        variant: 'destructive',
      })
    }
  }

  async function handleDeleteOverride(id: string) {
    try {
      const response = await authenticatedFetch(`/api/admin/capacity/overrides/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Löschen')
      }

      setOverrides(overrides.filter(o => o.id !== id))
      toast({
        title: 'Erfolg',
        description: 'Override wurde gelöscht',
      })
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Löschen',
        variant: 'destructive',
      })
    }
  }

  const getServiceLabel = (serviceType: string | null) => {
    if (!serviceType) return 'Gesamt'
    switch (serviceType) {
      case 'hundepension':
        return 'Urlaubsbetreuung'
      case 'katzenbetreuung':
        return 'Katzenbetreuung'
      case 'tagesbetreuung':
        return 'Tagesbetreuung'
      default:
        return serviceType
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  const totalCapacity = settings.find(s => !s.service_type)?.default_capacity || 0
  const hundepensionCapacity = settings.find(s => s.service_type === 'hundepension')?.default_capacity || 0
  const katzenbetreuungCapacity = settings.find(s => s.service_type === 'katzenbetreuung')?.default_capacity || 0
  const tagesbetreuungCapacity = settings.find(s => s.service_type === 'tagesbetreuung')?.default_capacity || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">Kapazitäten verwalten</h1>
        <p className="mt-2 text-sage-600">Lege Standard-Kapazitäten und Tages-Overrides fest</p>
      </div>

      {/* Standard-Kapazitäten */}
      <Card>
        <CardHeader>
          <CardTitle>Standard-Kapazitäten</CardTitle>
          <CardDescription>
            Diese Kapazitäten gelten für alle Tage, außer es gibt einen Override
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Gesamtkapazität</Label>
              <Input
                type="number"
                value={totalCapacity}
                onChange={(e) => setFormData({ ...formData, default_capacity: e.target.value })}
                min="1"
                placeholder="z.B. 10"
              />
            </div>
            <div>
              <Label>Urlaubsbetreuung</Label>
              <Input
                type="number"
                value={hundepensionCapacity}
                onChange={(e) => {
                  // Update spezifische Kapazität
                  const newSettings = settings.map(s =>
                    s.service_type === 'hundepension'
                      ? { ...s, default_capacity: parseInt(e.target.value) || 0 }
                      : s
                  )
                  if (!newSettings.find(s => s.service_type === 'hundepension')) {
                    newSettings.push({
                      id: '',
                      service_type: 'hundepension',
                      default_capacity: parseInt(e.target.value) || 0,
                      created_at: '',
                      updated_at: '',
                    })
                  }
                  setSettings(newSettings)
                }}
                min="1"
                placeholder="z.B. 5"
              />
            </div>
            <div>
              <Label>Katzenbetreuung</Label>
              <Input
                type="number"
                value={katzenbetreuungCapacity}
                onChange={(e) => {
                  const newSettings = settings.map(s =>
                    s.service_type === 'katzenbetreuung'
                      ? { ...s, default_capacity: parseInt(e.target.value) || 0 }
                      : s
                  )
                  if (!newSettings.find(s => s.service_type === 'katzenbetreuung')) {
                    newSettings.push({
                      id: '',
                      service_type: 'katzenbetreuung',
                      default_capacity: parseInt(e.target.value) || 0,
                      created_at: '',
                      updated_at: '',
                    })
                  }
                  setSettings(newSettings)
                }}
                min="1"
                placeholder="z.B. 8"
              />
            </div>
            <div>
              <Label>Tagesbetreuung</Label>
              <Input
                type="number"
                value={tagesbetreuungCapacity}
                onChange={(e) => {
                  const newSettings = settings.map(s =>
                    s.service_type === 'tagesbetreuung'
                      ? { ...s, default_capacity: parseInt(e.target.value) || 0 }
                      : s
                  )
                  if (!newSettings.find(s => s.service_type === 'tagesbetreuung')) {
                    newSettings.push({
                      id: '',
                      service_type: 'tagesbetreuung',
                      default_capacity: parseInt(e.target.value) || 0,
                      created_at: '',
                      updated_at: '',
                    })
                  }
                  setSettings(newSettings)
                }}
                min="1"
                placeholder="z.B. 6"
              />
            </div>
          </div>
          <Button onClick={handleSaveSettings} className="bg-sage-600 hover:bg-sage-700">
            Kapazitäten speichern
          </Button>
        </CardContent>
      </Card>

      {/* Tages-Overrides */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tages-Overrides</CardTitle>
              <CardDescription>
                Überschreibe Kapazitäten für spezifische Tage (z.B. Ferien)
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-sage-600 hover:bg-sage-700">
                  Neuer Override
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neuer Kapazitäts-Override</DialogTitle>
                  <DialogDescription>
                    Überschreibe die Standard-Kapazität für einen bestimmten Tag
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Datum *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {overrideForm.date ? (
                            format(overrideForm.date, 'PPP', { locale: de })
                          ) : (
                            <span>Datum wählen</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={overrideForm.date}
                          onSelect={(date) => setOverrideForm({ ...overrideForm, date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Service (optional)</Label>
                    <Select
                      value={overrideForm.service_type || 'all'}
                      onValueChange={(value) =>
                        setOverrideForm({ ...overrideForm, service_type: value === 'all' ? null : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Gesamt</SelectItem>
                        <SelectItem value="hundepension">Urlaubsbetreuung</SelectItem>
                        <SelectItem value="katzenbetreuung">Katzenbetreuung</SelectItem>
                        <SelectItem value="tagesbetreuung">Tagesbetreuung</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Kapazität *</Label>
                    <Input
                      type="number"
                      value={overrideForm.capacity}
                      onChange={(e) => setOverrideForm({ ...overrideForm, capacity: e.target.value })}
                      min="0"
                      placeholder="0 = geschlossen"
                    />
                  </div>
                  <div>
                    <Label>Grund (optional)</Label>
                    <Textarea
                      value={overrideForm.reason}
                      onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                      placeholder="z.B. Ferien, Feiertag..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleAddOverride} className="bg-sage-600 hover:bg-sage-700">
                      Erstellen
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {overrides.length > 0 ? (
            <div className="space-y-3">
              {overrides
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(override => (
                  <div
                    key={override.id}
                    className="p-4 border border-sage-200 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-sage-900">
                        {new Date(override.date).toLocaleDateString('de-DE', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-sage-600">
                        {getServiceLabel(override.service_type)}:{' '}
                        {override.capacity === 0 ? 'Geschlossen' : override.capacity}
                      </p>
                      {override.reason && (
                        <p className="text-sm text-sage-500 mt-1">{override.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOverride(override.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sage-600 text-center py-4">Keine Overrides vorhanden</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

