'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, Loader2, Plus, RefreshCw, RotateCcw } from 'lucide-react'

import {
  canRetrySevdeskArticleLink,
  SevdeskArticleMeta,
  SevdeskLinkBadge,
  SevdeskUsageBadge,
} from '@/components/admin/sevdesk-article-sync-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import {
  isAddonServiceArchived,
  isAddonServiceBillable,
  isAddonServiceWizardVisible,
} from '@/lib/booking-addon-services'
import {
  sortAddonServicesBySevdeskUsage,
} from '@/lib/sevdesk-part-usage'
import { VatNetSubline, grossAmountInputFromNet, netAmountFromGrossInput } from '@/components/vat-price-display'
import type { AddonService } from '@/lib/types'

type CatalogFilter = 'billable' | 'wizard_active' | 'inactive' | 'archived'

const VAT_HINT = 'Netto-Betrag wird gespeichert und auf der Rechnung mit 19 % USt. ausgewiesen.'

function matchesCatalogFilter(service: AddonService, filter: CatalogFilter): boolean {
  const archived = isAddonServiceArchived(service)
  const wizard = isAddonServiceWizardVisible(service)
  const billable = isAddonServiceBillable(service)

  switch (filter) {
    case 'billable':
      return billable
    case 'wizard_active':
      return wizard
    case 'inactive':
      return !wizard && !billable && !archived
    case 'archived':
      return archived
    default:
      return billable
  }
}

function getServiceStatusBadge(service: Pick<AddonService, 'is_active' | 'is_billable' | 'archived_at'>) {
  if (isAddonServiceArchived(service)) {
    return { label: 'Archiviert', className: 'bg-sage-200 text-sage-800 border-sage-300' }
  }
  if (isAddonServiceWizardVisible(service)) {
    return { label: 'In Buchungen sichtbar', className: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
  }
  if (isAddonServiceBillable(service)) {
    return { label: 'Nur abrechenbar', className: 'bg-blue-100 text-blue-900 border-blue-300' }
  }
  return { label: 'Inaktiv', className: '' }
}

function applyWizardToggle(is_active: boolean, is_billable: boolean) {
  if (is_active) {
    return { is_active: true, is_billable: true }
  }
  return { is_active: false, is_billable }
}

function applyBillableToggle(is_billable: boolean, is_active: boolean) {
  if (!is_billable) {
    return { is_billable: false, is_active: false }
  }
  return { is_billable: true, is_active }
}

interface DraftAddonService {
  title: string
  description: string
  amount: string
  sort_order: string
  is_active: boolean
  is_billable: boolean
}

const emptyDraft = (): DraftAddonService => ({
  title: '',
  description: '',
  amount: '',
  sort_order: '0',
  is_active: false,
  is_billable: true,
})

function parseGrossAmount(amountRaw: string): number | null {
  const gross = Number(amountRaw)
  if (!Number.isFinite(gross) || gross < 0) return null
  return gross
}

export function AddonServicesManager() {
  const { toast } = useToast()
  const [services, setServices] = useState<AddonService[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftAddonService>(emptyDraft)
  const [edits, setEdits] = useState<Record<string, DraftAddonService>>({})
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('billable')

  const filteredServices = useMemo(() => {
    const filtered = services.filter((service) => matchesCatalogFilter(service, catalogFilter))
    return sortAddonServicesBySevdeskUsage(filtered)
  }, [services, catalogFilter])

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
              amount: grossAmountInputFromNet(Number(service.amount)),
              sort_order: String(service.sort_order),
              is_active: service.is_active,
              is_billable: Boolean(service.is_billable),
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

  async function handleImportFromSevdesk() {
    setImporting(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/sevdesk/articles/import', {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Import fehlgeschlagen')

      toast({
        title: 'Import abgeschlossen',
        description: `${data.summary?.linked ?? 0} verknüpft, ${data.summary?.created ?? 0} neu angelegt, ${data.summary?.skipped ?? 0} übersprungen${
          data.summary?.usageUpdated
            ? `, Nutzungszahlen für ${data.summary.usageUpdated} Artikel aktualisiert`
            : data.summary?.usageFetchFailed
              ? ', Nutzungszahlen konnten nicht geladen werden'
              : ''
        }.`,
      })
      await loadServices()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Import fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  async function handleRetryLink(serviceId: string) {
    setLinkingId(serviceId)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/sevdesk/articles/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'addon_services', id: serviceId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Verknüpfung fehlgeschlagen')

      toast({
        title: data.linked ? 'Verknüpft' : 'Nicht verknüpft',
        description: data.reason || 'SevDesk-Verknüpfung aktualisiert',
        variant: data.linked ? 'default' : 'destructive',
      })
      await loadServices()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Verknüpfung fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setLinkingId(null)
    }
  }

  async function handleCreate() {
    const title = draft.title.trim()
    const amount = netAmountFromGrossInput(draft.amount)
    if (!title) {
      toast({ title: 'Fehler', description: 'Titel ist erforderlich', variant: 'destructive' })
      return
    }
    if (amount == null) {
      toast({ title: 'Fehler', description: 'Gültigen Bruttobetrag eingeben', variant: 'destructive' })
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
          is_billable: draft.is_billable,
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
    const amount = netAmountFromGrossInput(edit.amount)
    if (!title) {
      toast({ title: 'Fehler', description: 'Titel ist erforderlich', variant: 'destructive' })
      return
    }
    if (amount == null) {
      toast({ title: 'Fehler', description: 'Gültigen Bruttobetrag eingeben', variant: 'destructive' })
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
          is_billable: edit.is_billable,
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

  async function handleArchive(serviceId: string) {
    setSavingId(serviceId)
    try {
      const response = await authenticatedFetch(`/api/admin/addon-services/${serviceId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Archivieren')

      toast({ title: 'Erfolg', description: 'Zusatzleistung archiviert' })
      await loadServices()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Archivieren',
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  async function handleRestore(serviceId: string) {
    setSavingId(serviceId)
    try {
      const response = await authenticatedFetch(`/api/admin/addon-services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Wiederherstellen')

      toast({
        title: 'Erfolg',
        description: 'Zusatzleistung wiederhergestellt – Freigaben manuell aktivieren.',
      })
      await loadServices()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Wiederherstellen',
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  function updateEdit(serviceId: string, patch: Partial<DraftAddonService>) {
    setEdits((prev) => {
      const current = prev[serviceId]
      if (!current) return prev

      let next = { ...current, ...patch }
      if (patch.is_active !== undefined && patch.is_billable === undefined) {
        next = { ...next, ...applyWizardToggle(patch.is_active, next.is_billable) }
      }
      if (patch.is_billable !== undefined && patch.is_active === undefined) {
        next = { ...next, ...applyBillableToggle(patch.is_billable, next.is_active) }
      }
      return { ...prev, [serviceId]: next }
    })
  }

  function updateDraft(patch: Partial<DraftAddonService>) {
    setDraft((prev) => {
      let next = { ...prev, ...patch }
      if (patch.is_active !== undefined && patch.is_billable === undefined) {
        next = { ...next, ...applyWizardToggle(patch.is_active, next.is_billable) }
      }
      if (patch.is_billable !== undefined && patch.is_active === undefined) {
        next = { ...next, ...applyBillableToggle(patch.is_billable, next.is_active) }
      }
      return next
    })
  }

  const draftAmountGross = parseGrossAmount(draft.amount)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>SevDesk-Synchronisation</CardTitle>
              <CardDescription>
                Bestehende SevDesk-Artikel importieren und verknüpfen – ohne Änderungen an
                SevDesk-Beständen.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => void handleImportFromSevdesk()} disabled={importing}>
              {importing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
              Von SevDesk importieren
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Neue Zusatzleistung</CardTitle>
          <CardDescription>
            Standardmäßig abrechenbar. Buchungs-Freigabe und Abrechenbarkeit sind getrennt: In
            Buchungen sichtbare Leistungen können Kunden selbst buchen.
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
              <Label htmlFor="new-addon-amount">Betrag brutto (€)</Label>
              <Input
                id="new-addon-amount"
                type="number"
                min={0}
                step={0.01}
                value={draft.amount}
                onChange={(e) => setDraft((prev) => ({ ...prev, amount: e.target.value }))}
              />
              {draftAmountGross != null && (
                <VatNetSubline gross={draftAmountGross} className="mt-1" />
              )}
              <p className="text-xs text-sage-500">{VAT_HINT}</p>
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
                id="new-addon-billable"
                checked={draft.is_billable}
                onCheckedChange={(checked) => updateDraft({ is_billable: checked === true })}
              />
              <Label htmlFor="new-addon-billable">Abrechenbar (Admin / Rechnung)</Label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                id="new-addon-active"
                checked={draft.is_active}
                onCheckedChange={(checked) => updateDraft({ is_active: checked === true })}
              />
              <Label htmlFor="new-addon-active">In Buchungen sichtbar</Label>
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
            Buchungen, Abrechnung und Archiv sind unabhängig. Archivierte Leistungen sind weder buchbar
            noch abrechenbar. Bestehende Buchungen bleiben unverändert.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-sage-600">Lade…</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-sage-600">Noch keine Zusatzleistungen angelegt.</p>
          ) : (
            <Tabs value={catalogFilter} onValueChange={(value) => setCatalogFilter(value as CatalogFilter)}>
              <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
                <TabsTrigger value="billable">
                  Abrechenbar (Admin / Rechnung) (
                  {services.filter((s) => isAddonServiceBillable(s)).length})
                </TabsTrigger>
                <TabsTrigger value="wizard_active">
                  In Buchungen sichtbar ({services.filter((s) => isAddonServiceWizardVisible(s)).length})
                </TabsTrigger>
                <TabsTrigger value="inactive">
                  Inaktiv (
                  {services.filter(
                    (s) =>
                      !isAddonServiceWizardVisible(s) &&
                      !isAddonServiceBillable(s) &&
                      !s.archived_at
                  ).length})
                </TabsTrigger>
                <TabsTrigger value="archived">
                  Archiviert ({services.filter((s) => s.archived_at).length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={catalogFilter} className="space-y-4 mt-0">
                {filteredServices.length === 0 ? (
                  <p className="text-sm text-sage-600">Keine Einträge in dieser Ansicht.</p>
                ) : (
                  filteredServices.map((service) => {
                const edit = edits[service.id]
                if (!edit) return null
                const archived = isAddonServiceArchived(service)
                const statusBadge = getServiceStatusBadge(service)
                const amountGross = parseGrossAmount(edit.amount)

                return (
                  <div
                    key={service.id}
                    className={`space-y-4 rounded-lg border p-4 ${
                      archived
                        ? 'border-sage-300 bg-sage-100/60 opacity-80'
                        : 'border-sage-200 bg-sage-50/40'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sage-900">{service.title}</p>
                        <Badge variant="outline" className={statusBadge.className || undefined}>
                          {statusBadge.label}
                        </Badge>
                        <SevdeskLinkBadge status={service.sevdesk_sync_status} />
                        <SevdeskUsageBadge
                          usageCount={service.sevdesk_usage_count}
                          usageSyncedAt={service.sevdesk_usage_synced_at}
                          linked={Boolean(service.sevdesk_article_id)}
                        />
                      </div>
                      <SevdeskArticleMeta
                        status={service.sevdesk_sync_status}
                        articleId={service.sevdesk_article_id}
                        partNumber={service.sevdesk_part_number}
                        error={service.sevdesk_sync_error}
                        usageCount={service.sevdesk_usage_count}
                        usageSyncedAt={service.sevdesk_usage_synced_at}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Titel</Label>
                        <Input
                          value={edit.title}
                          onChange={(e) => updateEdit(service.id, { title: e.target.value })}
                          disabled={archived}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Betrag brutto (€)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={edit.amount}
                          onChange={(e) => updateEdit(service.id, { amount: e.target.value })}
                          disabled={archived}
                        />
                        {amountGross != null && (
                          <VatNetSubline gross={amountGross} className="mt-1" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Beschreibung</Label>
                      <Textarea
                        value={edit.description}
                        onChange={(e) => updateEdit(service.id, { description: e.target.value })}
                        rows={2}
                        disabled={archived}
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
                          disabled={archived}
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch
                          checked={edit.is_billable}
                          disabled={archived}
                          onCheckedChange={(checked) =>
                            updateEdit(service.id, { is_billable: checked === true })
                          }
                        />
                        <Label>Abrechenbar (Admin / Rechnung)</Label>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch
                          checked={edit.is_active}
                          disabled={archived}
                          onCheckedChange={(checked) =>
                            updateEdit(service.id, { is_active: checked === true })
                          }
                        />
                        <Label>In Buchungen sichtbar</Label>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {!archived && (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleSave(service.id)}
                              disabled={savingId === service.id}
                            >
                              {savingId === service.id ? 'Speichern…' : 'Speichern'}
                            </Button>
                            {canRetrySevdeskArticleLink({
                              status: service.sevdesk_sync_status,
                              articleId: service.sevdesk_article_id,
                            }) && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void handleRetryLink(service.id)}
                                disabled={linkingId === service.id}
                              >
                                {linkingId === service.id ? 'Verknüpfe…' : 'Nach SevDesk verknüpfen'}
                              </Button>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="shrink-0"
                            aria-label="Archivieren"
                            onClick={() => void handleArchive(service.id)}
                            disabled={savingId === service.id}
                          >
                            <Archive className="size-4" />
                          </Button>
                        </>
                      )}
                      {archived && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleRestore(service.id)}
                          disabled={savingId === service.id}
                        >
                          <RotateCcw className="mr-1 size-4" />
                          Wiederherstellen
                        </Button>
                      )}
                    </div>
                  </div>
                )
                  })
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
