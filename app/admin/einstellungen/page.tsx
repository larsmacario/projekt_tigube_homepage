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
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { SevdeskContact, SevdeskPart, SevdeskSettings } from '@/lib/types'
import { Loader2, RefreshCw } from 'lucide-react'

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
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const [contacts, setContacts] = useState<SevdeskContact[]>([])
  const [parts, setParts] = useState<SevdeskPart[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingParts, setLoadingParts] = useState(false)

  const loadSettings = useCallback(async () => {
    const response = await authenticatedFetch('/api/admin/integrations/sevdesk')
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Einstellungen konnten nicht geladen werden')
    }
    setSettings(data.settings ?? null)
  }, [])

  useEffect(() => {
    loadSettings()
      .catch((error) => {
        console.error(error)
        toast({
          title: 'Fehler',
          description: error instanceof Error ? error.message : 'Laden fehlgeschlagen',
          variant: 'destructive',
        })
      })
      .finally(() => setLoading(false))
  }, [loadSettings, toast])

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
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Kontakte konnten nicht geladen werden')
      }
      setContacts(data.contacts ?? [])
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

  async function loadParts() {
    setLoadingParts(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/sevdesk/parts?limit=50')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Artikel konnten nicht geladen werden')
      }
      setParts(data.parts ?? [])
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
          Externe Integrationen für Rechnungen und Abrechnung vorbereiten.
        </p>
      </div>

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
