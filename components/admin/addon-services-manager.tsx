'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { formatEuro } from '@/lib/price-override'
import type { AddonService } from '@/lib/types'

interface DraftAddonService {
  title: string
  description: string
  amount: string
  sort_order: string
  is_active: boolean
}

const emptyDraft = (): DraftAddonService => ({
  title: '',
  description: '',
  amount: '',
  sort_order: '0',
  is_active: false,
})

export function AddonServicesManager() {
  const { toast } = useToast()
  const [services, setServices] = useState<AddonService[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<DraftAddonService>(emptyDraft)
  const [edits, setEdits] = useState<Record<string, DraftAddonService>>({})

  const loadServices = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch('/api/admin/addon-services')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Laden')
      const list = (data.addonServices || []) as AddonService[]
      setServices(list)
      setEdits(
        Object.fromEntries(
          list.map((service) => [
            service.id,
            {
              title: service.title,
              description: service.description || '',
              amount: String(service.amount),
              sort_order: String(service.sort_order),
              is_active: service.is_active,
            },
          ])
        )
      )
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Laden',
        variant: 'destructive',
      })
      setServices([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadServices()
  }, [loadServices])

  async function handleCreate() {
    const title = draft.title.trim()
    const amount = Number(draft.amount)
    if (!title) {
      toast({ title: 'Fehler', description: 'Titel ist erforderlich', variant: 'destructive' })
      return
    }
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: 'Fehler', description: 'Gültigen Betrag eingeben', variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const response = await authenticatedFetch('/api/admin/addon-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: draft.description.trim() || null,
          amount,
          sort_order: Number(draft.sort_order) || 0,
          is_active: draft.is_active,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Erstellen')

      toast({ title: 'Erfolg', description: 'Zusatzleistung angelegt' })
      setDraft(emptyDraft())
      await loadServices()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Erstellen',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleSave(serviceId: string) {
    const edit = edits[serviceId]
    if (!edit) return

    const title = edit.title.trim()
    const amount = Number(edit.amount)
    if (!title) {
      toast({ title: 'Fehler', description: 'Titel ist erforderlich', variant: 'destructive' })
      return
    }
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: 'Fehler', description: 'Gültigen Betrag eingeben', variant: 'destructive' })
      return
    }

    setSavingId(serviceId)
    try {
      const response = await authenticatedFetch(`/api/admin/addon-services/${serviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: edit.description.trim() || null,
          amount,
          sort_order: Number(edit.sort_order) || 0,
          is_active: edit.is_active,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Speichern')

      toast({ title: 'Erfolg', description: 'Zusatzleistung gespeichert' })
      await loadServices()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  async function handleDeactivate(serviceId: string) {
    setSavingId(serviceId)
    try {
      const response = await authenticatedFetch(`/api/admin/addon-services/${serviceId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Deaktivieren')

      toast({ title: 'Erfolg', description: 'Zusatzleistung deaktiviert' })
      await loadServices()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Deaktivieren',
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  function updateEdit(serviceId: string, patch: Partial<DraftAddonService>) {
    setEdits((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], ...patch },
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Neue Zusatzleistung</CardTitle>
          <CardDescription>
            Standardmäßig inaktiv – erst nach Aktivierung im Buchungs-Wizard sichtbar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-addon-title">Titel</Label>
              <Input
                id="new-addon-title"
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="z. B. Medikamentengabe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-addon-amount">Betrag (€)</Label>
              <Input
                id="new-addon-amount"
                type="number"
                min={0}
                step={0.01}
                value={draft.amount}
                onChange={(e) => setDraft((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-addon-description">Beschreibung (optional)</Label>
            <Textarea
              id="new-addon-description"
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="space-y-2">
              <Label htmlFor="new-addon-sort">Sortierung</Label>
              <Input
                id="new-addon-sort"
                type="number"
                className="w-28"
                value={draft.sort_order}
                onChange={(e) => setDraft((prev) => ({ ...prev, sort_order: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                id="new-addon-active"
                checked={draft.is_active}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({ ...prev, is_active: checked === true }))
                }
              />
              <Label htmlFor="new-addon-active">Aktiv</Label>
            </div>
          </div>
          <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
            <Plus className="mr-2 size-4" />
            {creating ? 'Wird angelegt…' : 'Anlegen'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Katalog</CardTitle>
          <CardDescription>
            Deaktivierte Leistungen erscheinen nicht mehr im Wizard; bestehende Buchungen bleiben
            unverändert.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-sage-600">Lade…</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-sage-600">Noch keine Zusatzleistungen angelegt.</p>
          ) : (
            <div className="space-y-4">
              {services.map((service) => {
                const edit = edits[service.id]
                if (!edit) return null

                return (
                  <div
                    key={service.id}
                    className="space-y-4 rounded-lg border border-sage-200 bg-sage-50/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sage-900">{service.title}</p>
                        {edit.is_active ? (
                          <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300">
                            Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="outline">Inaktiv</Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-sage-800">
                        {formatEuro(Number(edit.amount) || 0)}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Titel</Label>
                        <Input
                          value={edit.title}
                          onChange={(e) => updateEdit(service.id, { title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Betrag (€)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={edit.amount}
                          onChange={(e) => updateEdit(service.id, { amount: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Beschreibung</Label>
                      <Textarea
                        value={edit.description}
                        onChange={(e) => updateEdit(service.id, { description: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <div className="space-y-2">
                        <Label>Sortierung</Label>
                        <Input
                          type="number"
                          className="w-28"
                          value={edit.sort_order}
                          onChange={(e) => updateEdit(service.id, { sort_order: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch
                          checked={edit.is_active}
                          onCheckedChange={(checked) =>
                            updateEdit(service.id, { is_active: checked === true })
                          }
                        />
                        <Label>Aktiv</Label>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleSave(service.id)}
                        disabled={savingId === service.id}
                      >
                        {savingId === service.id ? 'Speichern…' : 'Speichern'}
                      </Button>
                      {edit.is_active && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDeactivate(service.id)}
                          disabled={savingId === service.id}
                        >
                          <Trash2 className="mr-1 size-4" />
                          Deaktivieren
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
