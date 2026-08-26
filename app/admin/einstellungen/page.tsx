'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CollapsibleAdminCard } from '@/components/admin/collapsible-admin-card'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { readApiResponse } from '@/lib/read-api-response'
import type { SevdeskContact, SevdeskCustomerImportSummary, SevdeskPart, SevdeskSettings, SiteSettings, WaitlistCmsContent } from '@/lib/types'
import type { CustomerDuplicateGroup } from '@/lib/customer-merge'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatEuro(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export default function AdminEinstellungenPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<SevdeskSettings | null>(null)
  const [waitlistSettings, setWaitlistSettings] = useState<SiteSettings | null>(null)
  const [waitlistTexts, setWaitlistTexts] = useState<WaitlistCmsContent | null>(null)
  const [waitlistSaving, setWaitlistSaving] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const [contacts, setContacts] = useState<SevdeskContact[]>([])
  const [parts, setParts] = useState<SevdeskPart[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingParts, setLoadingParts] = useState(false)
  const [importingCustomers, setImportingCustomers] = useState(false)
  const [lastImportSummary, setLastImportSummary] = useState<SevdeskCustomerImportSummary | null>(
    null
  )
  const [importMailStats, setImportMailStats] = useState<{
    importedTotal: number
    onboardingOpen: number
    mailNotSent: number
    mailFailed: number
    mailSent: number
  } | null>(null)
  const [duplicateGroups, setDuplicateGroups] = useState<CustomerDuplicateGroup[]>([])
  const [loadingDuplicates, setLoadingDuplicates] = useState(false)
  const [mergingGroupEmail, setMergingGroupEmail] = useState<string | null>(null)

  const loadImportMailStats = useCallback(async () => {
    const response = await authenticatedFetch('/api/admin/integrations/sevdesk/import-stats')
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Import-Statistiken konnten nicht geladen werden')
    }
    setImportMailStats(data)
  }, [])

  const loadWaitlistSettings = useCallback(async () => {
    const response = await authenticatedFetch('/api/admin/settings/waitlist')
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Wartelisten-Einstellungen konnten nicht geladen werden')
    }
    setWaitlistSettings(data.settings ?? null)
    setWaitlistTexts(data.texts ?? null)
  }, [])

  const loadSettings = useCallback(async () => {
    const response = await authenticatedFetch('/api/admin/integrations/sevdesk')
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Einstellungen konnten nicht geladen werden')
    }
    setSettings(data.settings ?? null)
    setLastImportSummary(data.settings?.last_customer_import_summary ?? null)
  }, [])

  useEffect(() => {
    Promise.all([loadSettings(), loadWaitlistSettings(), loadImportMailStats(), loadDuplicateGroups()])
      .catch((error) => {
        console.error(error)
        toast({
          title: 'Fehler',
          description: error instanceof Error ? error.message : 'Laden fehlgeschlagen',
          variant: 'destructive',
        })
      })
      .finally(() => setLoading(false))
  }, [loadSettings, loadWaitlistSettings, loadImportMailStats, toast])

  async function handleWaitlistToggle(enabled: boolean) {
    setWaitlistSaving(true)
    try {
      const response = await authenticatedFetch('/api/admin/settings/waitlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waitlistEnabled: enabled }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Speichern fehlgeschlagen')
      }
      setWaitlistSettings(data.settings ?? null)
      toast({
        title: enabled ? 'Warteliste aktiviert' : 'Warteliste deaktiviert',
        description: enabled
          ? 'Neue Anfragen werden als Wartelisten-Einträge gespeichert.'
          : 'Das Anfrageformular verhält sich wieder wie gewohnt.',
      })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Speichern fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setWaitlistSaving(false)
    }
  }

  async function handleSaveKey() {
    setSaving(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/sevdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (data.settings) {
          setSettings(data.settings)
        }
        throw new Error(data.error || 'Speichern fehlgeschlagen')
      }
      setSettings(data.settings ?? null)
      setApiKeyInput('')
      toast({
        title: 'Gespeichert',
        description: 'SevDesk-Verbindung wurde eingerichtet und getestet.',
      })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Speichern fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/sevdesk/test', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.settings) {
        setSettings(data.settings)
      }
      if (!response.ok) {
        throw new Error(data.error || 'Verbindungstest fehlgeschlagen')
      }
      toast({
        title: 'Verbindung OK',
        description: 'SevDesk antwortet wie erwartet.',
      })
    } catch (error) {
      toast({
        title: 'Verbindungstest fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      })
    } finally {
      setTesting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/sevdesk', {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Trennen fehlgeschlagen')
      }
      setSettings(data.settings ?? null)
      setContacts([])
      setParts([])
      toast({
        title: 'Getrennt',
        description: 'Der SevDesk API-Key wurde entfernt.',
      })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Trennen fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setDisconnecting(false)
    }
  }

  async function loadContacts() {
    setLoadingContacts(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/sevdesk/contacts?limit=50')
      const { data, error } = await readApiResponse<{ contacts?: SevdeskContact[] }>(response)
      if (error) throw new Error(error)
      setContacts(data?.contacts ?? [])
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Kontakte laden fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setLoadingContacts(false)
    }
  }

  async function handleImportCustomers() {
    setImportingCustomers(true)
    try {
      const response = await authenticatedFetch(
        '/api/admin/integrations/sevdesk/import-customers',
        { method: 'POST' }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Kundenimport fehlgeschlagen')
      }
      setLastImportSummary(data.summary ?? null)
      await loadImportMailStats()
      await loadSettings()
      await loadDuplicateGroups()
      toast({
        title: 'Kundenimport abgeschlossen',
        description: `${data.summary?.created ?? 0} neu, ${data.summary?.updated ?? 0} aktualisiert, ${data.summary?.skipped ?? 0} übersprungen.`,
      })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Kundenimport fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setImportingCustomers(false)
    }
  }

  async function loadDuplicateGroups() {
    setLoadingDuplicates(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/sevdesk/duplicate-customers')
      const { data, error } = await readApiResponse<{ groups?: CustomerDuplicateGroup[] }>(response)
      if (error) throw new Error(error)
      setDuplicateGroups(data?.groups ?? [])
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Dubletten konnten nicht geladen werden',
        variant: 'destructive',
      })
    } finally {
      setLoadingDuplicates(false)
    }
  }

  async function handleMergeDuplicateGroup(group: CustomerDuplicateGroup) {
    if (!group.suggestedTargetId || !group.suggestedSourceId) return

    setMergingGroupEmail(group.email)
    try {
      const response = await authenticatedFetch(
        '/api/admin/integrations/sevdesk/duplicate-customers/merge',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetCustomerId: group.suggestedTargetId,
            sourceCustomerId: group.suggestedSourceId,
          }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Zusammenführen fehlgeschlagen')
      }
      await loadDuplicateGroups()
      toast({
        title: 'Kunden zusammengeführt',
        description: `Die Dublette für ${group.email} wurde bereinigt.`,
      })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Zusammenführen fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setMergingGroupEmail(null)
    }
  }

  async function loadParts() {
    setLoadingParts(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/sevdesk/parts?limit=50')
      const { data, error } = await readApiResponse<{ parts?: SevdeskPart[] }>(response)
      if (error) throw new Error(error)
      setParts(data?.parts ?? [])
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Artikel laden fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setLoadingParts(false)
    }
  }

  const isConnected = Boolean(settings?.is_connected)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sage-600">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Lade Einstellungen…
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-sage-900">Einstellungen</h1>
        <p className="text-sage-600 mt-1">
          Globale Optionen und externe Integrationen für Rechnungen und Abrechnung.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <CardTitle>Wartelisten-Modus</CardTitle>
              <CardDescription className="mt-1">
                Wenn aktiv, informiert das Anfrageformular über die Warteliste und speichert neue
                Eingänge getrennt von regulären Leads.
              </CardDescription>
            </div>
            <Badge variant={waitlistSettings?.waitlist_enabled ? 'default' : 'secondary'}>
              {waitlistSettings?.waitlist_enabled ? 'Aktiv' : 'Inaktiv'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 max-w-xl">
            <div className="space-y-1">
              <Label htmlFor="waitlist-enabled">Warteliste für Kennenlernen</Label>
              <p className="text-xs text-sage-500">
                Betrifft alle öffentlichen Anfrageformulare auf der Website.
              </p>
            </div>
            <Switch
              id="waitlist-enabled"
              checked={Boolean(waitlistSettings?.waitlist_enabled)}
              disabled={waitlistSaving}
              onCheckedChange={handleWaitlistToggle}
            />
          </div>

          {waitlistTexts && (
            <div className="rounded-lg border border-sage-200 bg-sage-50/60 p-4 text-sm text-sage-700 space-y-2 max-w-2xl">
              <p className="font-medium text-sage-900">Aktuelle Formular-Vorschau</p>
              <p>
                <span className="font-medium">Titel:</span> {waitlistTexts.formTitle}
              </p>
              <p>
                <span className="font-medium">Hinweis:</span> {waitlistTexts.formHint}
              </p>
            </div>
          )}

          <Button variant="outline" asChild>
            <Link href="/admin/cms">
              <ExternalLink className="h-4 w-4 mr-2" />
              Wartelisten-Texte im CMS bearbeiten
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <CardTitle>SevDesk-Anbindung</CardTitle>
              <CardDescription className="mt-1">
                API-Key sicher im Supabase Vault speichern. Später können Buchungen für
                Rechnungen an SevDesk übergeben werden.
              </CardDescription>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Verbunden' : 'Nicht verbunden'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-sage-500">Key-Vorschau</dt>
              <dd className="font-mono">{settings?.key_preview ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sage-500">Verbunden seit</dt>
              <dd>{formatDateTime(settings?.connected_at)}</dd>
            </div>
            <div>
              <dt className="text-sage-500">Letzter Test</dt>
              <dd>{formatDateTime(settings?.last_tested_at)}</dd>
            </div>
            <div>
              <dt className="text-sage-500">Testergebnis</dt>
              <dd>
                {settings?.last_test_ok === true && (
                  <span className="text-green-700">Erfolgreich</span>
                )}
                {settings?.last_test_ok === false && (
                  <span className="text-red-700">
                    Fehlgeschlagen
                    {settings.last_test_error ? `: ${settings.last_test_error}` : ''}
                  </span>
                )}
                {settings?.last_test_ok == null && '—'}
              </dd>
            </div>
          </dl>

          <div className="space-y-2 max-w-xl">
            <Label htmlFor="sevdesk-api-key">SevDesk API-Key</Label>
            <Input
              id="sevdesk-api-key"
              type="password"
              autoComplete="off"
              placeholder={isConnected ? 'Neuen Key eingeben zum Ersetzen' : 'API-Key einfügen'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
            <p className="text-xs text-sage-500">
              Den Key findest du in SevDesk unter Einstellungen → Benutzer → API-Token.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSaveKey}
              disabled={saving || apiKeyInput.trim().length < 8}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Speichern & testen
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={!isConnected || testing}
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verbindung testen
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!isConnected || disconnecting}>
                  Trennen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>SevDesk-Verbindung trennen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Der API-Key wird aus dem Vault gelöscht. Rechnungs-Exporte funktionieren
                    danach nicht mehr, bis ein neuer Key hinterlegt wird.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDisconnect}>Trennen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SevDesk-Kundenimport</CardTitle>
          <CardDescription>
            Importiert alle SevDesk-Kontakte mit dem Tag „aktiv“ ins Portal. Bestehende Kunden werden
            über SevDesk-ID, Kundennummer oder E-Mail zugeordnet. Das Portal bleibt für bestätigte
            Login-Adressen führend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void handleImportCustomers()}
              disabled={!isConnected || importingCustomers}
            >
              {importingCustomers ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Aktive Kunden importieren
            </Button>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-sage-500">Letzter Import</dt>
              <dd>{formatDateTime(settings?.last_customer_import_at)}</dd>
            </div>
            {lastImportSummary && (
              <>
                <div>
                  <dt className="text-sage-500">Ergebnis</dt>
                  <dd>
                    {lastImportSummary.created} neu · {lastImportSummary.updated} aktualisiert ·{' '}
                    {lastImportSummary.skipped} übersprungen · {lastImportSummary.failed} Fehler
                  </dd>
                </div>
              </>
            )}
            {importMailStats && importMailStats.importedTotal > 0 && (
              <>
                <div>
                  <dt className="text-sage-500">Importierte Kunden gesamt</dt>
                  <dd>{importMailStats.importedTotal}</dd>
                </div>
                <div>
                  <dt className="text-sage-500">Ohne Onboarding-Mail</dt>
                  <dd>
                    {importMailStats.mailNotSent}
                    {importMailStats.mailFailed > 0 && (
                      <span className="text-red-600">
                        {' '}
                        ({importMailStats.mailFailed} fehlgeschlagen)
                      </span>
                    )}
                  </dd>
                </div>
              </>
            )}
          </dl>

          {importMailStats && importMailStats.mailNotSent > 0 && (
            <p className="text-sm text-sage-600">
              {importMailStats.mailNotSent} importierte Kunden haben noch keine Onboarding-Einladung
              erhalten. Nutzen Sie in der{' '}
              <Link href="/admin/customers" className="underline hover:text-sage-800">
                Kundenliste
              </Link>{' '}
              die Sammel-Einladung.
            </p>
          )}

          {lastImportSummary?.failures && lastImportSummary.failures.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 space-y-1">
              <p className="font-medium">Fehler beim Import</p>
              {lastImportSummary.failures.slice(0, 5).map((failure, index) => (
                <p key={`${failure.customerNumber}-${index}`}>
                  {failure.customerNumber || '—'}: {failure.reason}
                </p>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-sage-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-sage-900">Kunden-Dubletten abgleichen</p>
                <p className="text-sm text-sage-600">
                  Zeigt Kunden mit identischer E-Mail. Portal-Datensätze bleiben führend; SevDesk-Stammdaten
                  werden auf den Ziel-Kunden übernommen.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadDuplicateGroups()}
                disabled={loadingDuplicates}
              >
                {loadingDuplicates ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Aktualisieren
              </Button>
            </div>

            {loadingDuplicates && duplicateGroups.length === 0 ? (
              <p className="text-sm text-sage-500">Dubletten werden geladen …</p>
            ) : duplicateGroups.length === 0 ? (
              <p className="text-sm text-sage-600">Keine Kunden-Dubletten gefunden.</p>
            ) : (
              <div className="space-y-3">
                {duplicateGroups.map((group) => {
                  const target = group.customers.find((customer) => customer.id === group.suggestedTargetId)
                  const source = group.customers.find((customer) => customer.id === group.suggestedSourceId)

                  return (
                    <div
                      key={group.email}
                      className="rounded-md border border-sage-200 bg-white p-3 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{group.email}</p>
                          <p className="text-sm text-sage-600">
                            {group.customers.length} Datensätze
                            {group.kind === 'key_conflict' ? ' · manuell klären' : ''}
                          </p>
                          {group.reason && (
                            <p className="mt-1 text-sm text-amber-800">{group.reason}</p>
                          )}
                        </div>
                        {group.mergeable && target && source ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                loading={mergingGroupEmail === group.email}
                                disabled={mergingGroupEmail !== null && mergingGroupEmail !== group.email}
                              >
                                Zusammenführen
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Kunden-Dublette zusammenführen?</AlertDialogTitle>
                                <AlertDialogDescription asChild>
                                  <div className="space-y-2 text-sm">
                                    <p>
                                      Ziel bleibt{' '}
                                      <strong>
                                        {[target.vorname, target.nachname].filter(Boolean).join(' ') || target.email}
                                      </strong>
                                      {target.user_id ? ' (Portal-Konto)' : ''}.
                                    </p>
                                    <p>
                                      Quelle{' '}
                                      <strong>
                                        {[source.vorname, source.nachname].filter(Boolean).join(' ') || source.email}
                                      </strong>{' '}
                                      wird gelöscht, nachdem Tiere, Dokumente, Buchungen und SevDesk-Felder
                                      übernommen wurden.
                                    </p>
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void handleMergeDuplicateGroup(group)}>
                                  Zusammenführen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Portal</TableHead>
                              <TableHead>Kundennummer</TableHead>
                              <TableHead>SevDesk</TableHead>
                              <TableHead>Tiere</TableHead>
                              <TableHead>Dokumente</TableHead>
                              <TableHead>Buchungen</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.customers.map((customer) => (
                              <TableRow key={customer.id}>
                                <TableCell>
                                  {[customer.vorname, customer.nachname].filter(Boolean).join(' ') || '—'}
                                  {customer.id === group.suggestedTargetId ? (
                                    <Badge variant="secondary" className="ml-2">Ziel</Badge>
                                  ) : customer.id === group.suggestedSourceId ? (
                                    <Badge variant="outline" className="ml-2">Quelle</Badge>
                                  ) : null}
                                </TableCell>
                                <TableCell>{customer.user_id ? 'Ja' : 'Nein'}</TableCell>
                                <TableCell>{customer.kundennummer || '—'}</TableCell>
                                <TableCell>{customer.sevdesk_contact_id || '—'}</TableCell>
                                <TableCell>{customer.petCount}</TableCell>
                                <TableCell>{customer.documentCount}</TableCell>
                                <TableCell>{customer.bookingCount}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CollapsibleAdminCard
        title="SevDesk-Kontakte (Vorschau)"
        defaultExpanded={false}
        headerActions={
          <Button
            size="sm"
            variant="outline"
            disabled={!isConnected || loadingContacts}
            onClick={(e) => {
              e.stopPropagation()
              void loadContacts()
            }}
          >
            {loadingContacts ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Aktualisieren</span>
          </Button>
        }
      >
        {!isConnected ? (
          <p className="text-sm text-sage-600">Zuerst SevDesk verbinden.</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-sage-600">
            Noch keine Kontakte geladen. Auf „Aktualisieren“ klicken.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Kundennummer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-mono text-xs">{contact.id}</TableCell>
                  <TableCell>
                    {[contact.name, contact.surename].filter(Boolean).join(' ') || '—'}
                  </TableCell>
                  <TableCell>{contact.customerNumber ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CollapsibleAdminCard>

      <CollapsibleAdminCard
        title="SevDesk-Artikel (Vorschau)"
        defaultExpanded={false}
        headerActions={
          <Button
            size="sm"
            variant="outline"
            disabled={!isConnected || loadingParts}
            onClick={(e) => {
              e.stopPropagation()
              void loadParts()
            }}
          >
            {loadingParts ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Aktualisieren</span>
          </Button>
        }
      >
        {!isConnected ? (
          <p className="text-sm text-sage-600">Zuerst SevDesk verbinden.</p>
        ) : parts.length === 0 ? (
          <p className="text-sm text-sage-600">
            Noch keine Artikel geladen. Auf „Aktualisieren“ klicken.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Bezeichnung</TableHead>
                <TableHead>Artikelnummer</TableHead>
                <TableHead>Preis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part) => (
                <TableRow key={part.id}>
                  <TableCell className="font-mono text-xs">{part.id}</TableCell>
                  <TableCell>{part.name ?? '—'}</TableCell>
                  <TableCell>{part.partNumber ?? '—'}</TableCell>
                  <TableCell>{formatEuro(part.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CollapsibleAdminCard>
    </div>
  )
}
