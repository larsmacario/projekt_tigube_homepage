'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Trash2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

interface VacationDate {
  id?: string
  period: string
  label: string
}

interface NewsBarSettings {
  id: string
  title: string
  subtitle: string
  dialog_title: string
  dialog_description: string
  hint_text: string
  is_active: boolean
}

export default function NewsBarPage() {
  const [settings, setSettings] = useState<NewsBarSettings | null>(null)
  const [vacationDates, setVacationDates] = useState<VacationDate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const response = await authenticatedFetch('/api/admin/newsbar')
      const data = await response.json()
      
      if (data.settings) {
        setSettings(data.settings)
      }
      if (data.vacationDates) {
        setVacationDates(data.vacationDates)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!settings) return

    setSaving(true)
    try {
      const response = await authenticatedFetch('/api/admin/newsbar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, vacationDates }),
      })

      if (response.ok) {
        toast({
          title: 'Erfolg',
          description: 'NewsBar erfolgreich gespeichert!',
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
      console.error('Error saving:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  function addVacationDate() {
    setVacationDates([...vacationDates, { period: '', label: '' }])
  }

  function removeVacationDate(index: number) {
    setVacationDates(vacationDates.filter((_, i) => i !== index))
  }

  function updateVacationDate(index: number, field: 'period' | 'label', value: string) {
    const updated = [...vacationDates]
    updated[index] = { ...updated[index], [field]: value }
    setVacationDates(updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-sage-600">Keine NewsBar-Einstellungen gefunden</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-sage-900">NewsBar verwalten</h1>
          <p className="mt-2 text-sage-600">Bearbeiten Sie die Urlaubszeiten und Ankündigungen</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-sage-600 hover:bg-sage-700"
        >
          {saving ? 'Wird gespeichert...' : 'Speichern'}
        </Button>
      </div>

      {/* Allgemeine Einstellungen */}
      <Card>
        <CardHeader>
          <CardTitle>Allgemeine Einstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>NewsBar aktiv</Label>
              <p className="text-sm text-sage-600">Zeigt die NewsBar auf der Website an</p>
            </div>
            <Switch
              checked={settings.is_active}
              onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Titel (oben in der Bar)</Label>
              <Input
                id="title"
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                placeholder="z.B. UNSERE FERIEN 2025"
              />
            </div>
            <div>
              <Label htmlFor="subtitle">Untertitel</Label>
              <Input
                id="subtitle"
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                placeholder="z.B. Planen Sie Ihre Tierbetreuung rechtzeitig!"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dialog_title">Dialog-Titel (im Popup)</Label>
            <Input
              id="dialog_title"
              value={settings.dialog_title}
              onChange={(e) => setSettings({ ...settings, dialog_title: e.target.value })}
              placeholder="z.B. UNSERE BETRIEBSFERIEN 2025"
            />
          </div>

          <div>
            <Label htmlFor="dialog_description">Dialog-Beschreibung</Label>
            <Input
              id="dialog_description"
              value={settings.dialog_description}
              onChange={(e) => setSettings({ ...settings, dialog_description: e.target.value })}
              placeholder="z.B. In diesen Zeiten findet keine Tierbetreuung statt"
            />
          </div>

          <div>
            <Label htmlFor="hint_text">Hinweistext</Label>
            <Textarea
              id="hint_text"
              value={settings.hint_text}
              onChange={(e) => setSettings({ ...settings, hint_text: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ferienzeiten */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Ferienzeiten</CardTitle>
            <Button onClick={addVacationDate} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vacationDates.length === 0 ? (
            <p className="text-sage-600 text-center py-4">Keine Ferienzeiten eingetragen</p>
          ) : (
            <div className="space-y-4">
              {vacationDates.map((date, index) => (
                <div key={index} className="flex gap-4 items-start p-4 border border-sage-200 rounded-lg">
                  <div className="flex-1">
                    <Label>Zeitraum</Label>
                    <Input
                      value={date.period}
                      onChange={(e) => updateVacationDate(index, 'period', e.target.value)}
                      placeholder="z.B. 21.03.-31.03."
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Bezeichnung</Label>
                    <Input
                      value={date.label}
                      onChange={(e) => updateVacationDate(index, 'label', e.target.value)}
                      placeholder="z.B. Osterferien - Geschlossen"
                    />
                  </div>
                  <Button
                    onClick={() => removeVacationDate(index)}
                    variant="outline"
                    size="icon"
                    className="mt-6 text-red-600 hover:text-red-700 hover:bg-red-50"
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
  )
}

