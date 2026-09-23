'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import type { GoogleCalendarSettings } from '@/lib/types'
import { Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react'

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

type CalendarOption = { id: string; summary: string; primary?: boolean }

export function GoogleCalendarIntegrationCard() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [settings, setSettings] = useState<GoogleCalendarSettings | null>(null)
  const [redirectUri, setRedirectUri] = useState('')
  const [loading, setLoading] = useState(true)
  const [clientIdInput, setClientIdInput] = useState('')
  const [clientSecretInput, setClientSecretInput] = useState('')
  const [savingCredentials, setSavingCredentials] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testPreview, setTestPreview] = useState<string[] | null>(null)
  const [calendars, setCalendars] = useState<CalendarOption[]>([])
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [savingCalendar, setSavingCalendar] = useState(false)
  const [blockingSaving, setBlockingSaving] = useState(false)

  const loadSettings = useCallback(async () => {
    const response = await authenticatedFetch('/api/admin/integrations/google-calendar')
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Google-Kalender-Einstellungen konnten nicht geladen werden')
    }
    setSettings(data.settings ?? null)
    setRedirectUri(data.redirectUri ?? '')
    if (data.settings?.client_id) {
      setClientIdInput(data.settings.client_id)
    }
  }, [])

  const loadCalendars = useCallback(async () => {
    setLoadingCalendars(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/google-calendar/calendars')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Kalender konnten nicht geladen werden')
      }
      setCalendars(data.calendars ?? [])
    } catch (error) {
      toast({
        title: 'Kalender laden fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      })
    } finally {
      setLoadingCalendars(false)
    }
  }, [toast])

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

  useEffect(() => {
    const status = searchParams.get('google_calendar')
    const message = searchParams.get('google_calendar_message')
    if (!status) return

    if (status === 'connected') {
      toast({
        title: 'Google verbunden',
        description: 'Wähle jetzt den Kalender aus, dessen Termine Buchungen blockieren sollen.',
      })
      loadSettings().catch(console.error)
      loadCalendars().catch(console.error)
    } else if (status === 'error') {
      toast({
        title: 'Google-Verbindung fehlgeschlagen',
        description: message || 'Bitte erneut versuchen.',
        variant: 'destructive',
      })
    }

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('google_calendar')
      url.searchParams.delete('google_calendar_message')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [searchParams, toast, loadSettings, loadCalendars])

  useEffect(() => {
    if (settings?.is_connected) {
      loadCalendars().catch(console.error)
    }
  }, [settings?.is_connected, loadCalendars])

  async function handleSaveCredentials() {
    setSavingCredentials(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientIdInput,
          clientSecret: clientSecretInput,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Speichern fehlgeschlagen')
      }
      setSettings(data.settings ?? null)
      setRedirectUri(data.redirectUri ?? redirectUri)
      setClientSecretInput('')
      toast({
        title: 'OAuth-Daten gespeichert',
        description: 'Du kannst jetzt „Mit Google verbinden“ starten.',
      })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Speichern fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setSavingCredentials(false)
    }
  }

  function handleConnectGoogle() {
    window.location.href = '/api/admin/integrations/google-calendar/oauth/start'
  }

  async function handleCalendarChange(calendarId: string) {
    const selected = calendars.find((c) => c.id === calendarId)
    setSavingCalendar(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/google-calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId,
          calendarSummary: selected?.summary ?? '',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Kalender konnte nicht gespeichert werden')
      }
      setSettings(data.settings ?? null)
      toast({ title: 'Kalender gespeichert' })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Speichern fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setSavingCalendar(false)
    }
  }

  async function handleBlockingToggle(enabled: boolean) {
    setBlockingSaving(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/google-calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockingEnabled: enabled }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Speichern fehlgeschlagen')
      }
      setSettings(data.settings ?? null)
      toast({
        title: enabled ? 'Blockierung aktiv' : 'Blockierung pausiert',
        description: enabled
          ? 'Belegte Kalendertage sperren neue Buchungen im Portal.'
          : 'Der Kalender wird nur noch angezeigt, blockiert aber keine Buchungen.',
      })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Speichern fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setBlockingSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestPreview(null)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/google-calendar/test', {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Test fehlgeschlagen')
      }
      setSettings(data.settings ?? settings)
      setTestPreview(data.blockedDates ?? [])
      toast({
        title: 'Verbindung OK',
        description: `${(data.blockedDates ?? []).length} blockierte Tage in den nächsten 14 Tagen.`,
      })
    } catch (error) {
      toast({
        title: 'Test fehlgeschlagen',
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
      const response = await authenticatedFetch('/api/admin/integrations/google-calendar', {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Trennen fehlgeschlagen')
      }
      setSettings(data.settings ?? null)
      setCalendars([])
      setTestPreview(null)
      setClientSecretInput('')
      toast({ title: 'Google-Verbindung getrennt' })
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

  async function copyRedirectUri() {
    if (!redirectUri) return
    try {
      await navigator.clipboard.writeText(redirectUri)
      toast({ title: 'Weiterleitungs-URI kopiert' })
    } catch {
      toast({
        title: 'Kopieren fehlgeschlagen',
        description: redirectUri,
        variant: 'destructive',
      })
    }
  }

  const statusBadge = (() => {
    if (settings?.blocking_enabled && settings.is_connected && settings.calendar_id) {
      return { label: 'Blockierung aktiv', variant: 'default' as const }
    }
    if (settings?.is_connected) {
      return { label: 'Verbunden', variant: 'default' as const }
    }
    if (settings?.oauth_configured) {
      return { label: 'OAuth bereit', variant: 'secondary' as const }
    }
    return { label: 'Nicht konfiguriert', variant: 'secondary' as const }
  })()

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10 text-sage-600">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Google Kalender wird geladen…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <CardTitle>Google-Kalender</CardTitle>
            <CardDescription className="mt-1">
              Ein Firmen-Kalender pro Betrieb. Belegte Tage können Buchungen im Portal blockieren
              (nur Lesen, keine Termine werden angelegt).
            </CardDescription>
          </div>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <CollapsibleAdminCard title="Einrichtungs-Anleitung (Google Cloud Console)" defaultExpanded={!settings?.oauth_configured}>
          <ol className="list-decimal list-inside space-y-3 text-sm text-sage-700 max-w-2xl">
            <li>
              In der{' '}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage-900 underline inline-flex items-center gap-1"
              >
                Google Cloud Console
                <ExternalLink className="h-3.5 w-3.5" />
              </a>{' '}
              ein Projekt anlegen oder auswählen.
            </li>
            <li>
              Die <strong>Google Calendar API</strong> aktivieren (APIs &amp; Dienste → Bibliothek).
            </li>
            <li>
              Unter <strong>OAuth-Zustimmungsbildschirm</strong> den Typ „Extern“ wählen, App-Name und
              Support-E-Mail eintragen. Solange die App im Testmodus ist, alle Google-Konten, die
              sich verbinden sollen, als <strong>Testnutzer</strong> hinzufügen.
            </li>
            <li>
              Unter <strong>Anmeldedaten</strong> einen OAuth-Client vom Typ „Webanwendung“ anlegen.
              Als autorisierte Weiterleitungs-URI exakt diese URL eintragen:
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="text-xs bg-sage-100 px-2 py-1 rounded break-all">{redirectUri || '—'}</code>
                <Button type="button" variant="outline" size="sm" onClick={copyRedirectUri} disabled={!redirectUri}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Kopieren
                </Button>
              </div>
              <p className="text-xs text-sage-500 mt-2">
                Für lokale Entwicklung zusätzlich{' '}
                <code className="bg-sage-100 px-1 rounded">
                  http://localhost:3000/api/admin/integrations/google-calendar/oauth/callback
                </code>{' '}
                eintragen.
              </p>
            </li>
            <li>Client-ID und Client-Geheimnis unten speichern.</li>
            <li>Mit „Mit Google verbinden“ das Betriebs-Google-Konto autorisieren.</li>
            <li>Kalender wählen und „Belegte Termine blockieren Buchungen“ aktivieren.</li>
          </ol>
          <p className="text-xs text-sage-500 mt-4 max-w-2xl">
            Hinweis: In Google Cloud ist oft eine aktivierte Abrechnung nötig, auch wenn die
            Calendar API im Free Tier liegt. Die App liest nur Kalenderbelegungen – sie erstellt
            oder ändert keine Termine.
          </p>
        </CollapsibleAdminCard>

        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-sage-500">Kalender</dt>
            <dd>{settings?.calendar_summary ?? settings?.calendar_id ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sage-500">Verbunden seit</dt>
            <dd>{formatDateTime(settings?.connected_at)}</dd>
          </div>
          <div>
            <dt className="text-sage-500">Letzte FreeBusy-Abfrage</dt>
            <dd>{formatDateTime(settings?.last_freebusy_at)}</dd>
          </div>
          <div>
            <dt className="text-sage-500">Status</dt>
            <dd>
              {settings?.last_freebusy_ok === true && (
                <span className="text-green-700">Erfolgreich</span>
              )}
              {settings?.last_freebusy_ok === false && (
                <span className="text-red-700">
                  Fehlgeschlagen
                  {settings.last_freebusy_error ? `: ${settings.last_freebusy_error}` : ''}
                </span>
              )}
              {settings?.last_freebusy_ok == null && '—'}
            </dd>
          </div>
        </dl>

        <div className="space-y-2 max-w-xl">
          <Label htmlFor="google-oauth-client-id">OAuth Client-ID</Label>
          <Input
            id="google-oauth-client-id"
            autoComplete="off"
            value={clientIdInput}
            onChange={(e) => setClientIdInput(e.target.value)}
            placeholder="123456789.apps.googleusercontent.com"
          />
        </div>
        <div className="space-y-2 max-w-xl">
          <Label htmlFor="google-oauth-client-secret">OAuth Client-Geheimnis</Label>
          <Input
            id="google-oauth-client-secret"
            type="password"
            autoComplete="off"
            value={clientSecretInput}
            onChange={(e) => setClientSecretInput(e.target.value)}
            placeholder={settings?.oauth_configured ? 'Neues Geheimnis zum Ersetzen' : 'Geheimnis einfügen'}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSaveCredentials}
            disabled={
              savingCredentials ||
              clientIdInput.trim().length < 10 ||
              clientSecretInput.trim().length < 10
            }
          >
            {savingCredentials && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            OAuth-Daten speichern
          </Button>
          <Button
            variant="secondary"
            onClick={handleConnectGoogle}
            disabled={!settings?.oauth_configured}
          >
            Mit Google verbinden
          </Button>
        </div>

        {settings?.is_connected && (
          <div className="space-y-4 pt-2 border-t border-sage-200">
            <div className="space-y-2 max-w-xl">
              <Label>Kalender für Belegungsprüfung</Label>
              <Select
                value={settings.calendar_id ?? ''}
                onValueChange={handleCalendarChange}
                disabled={savingCalendar || loadingCalendars}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCalendars ? 'Lade Kalender…' : 'Kalender wählen'} />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id}>
                      {cal.summary}
                      {cal.primary ? ' (Standard)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={() => loadCalendars()} disabled={loadingCalendars}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingCalendars ? 'animate-spin' : ''}`} />
                Kalenderliste aktualisieren
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 max-w-xl">
              <div className="space-y-1">
                <Label htmlFor="google-blocking">Belegte Termine blockieren Buchungen</Label>
                <p className="text-xs text-sage-500">
                  Jeder Kalendertag mit mindestens einem Termin gilt als nicht buchbar.
                </p>
              </div>
              <Switch
                id="google-blocking"
                checked={Boolean(settings.blocking_enabled)}
                disabled={blockingSaving || !settings.calendar_id}
                onCheckedChange={handleBlockingToggle}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleTest} disabled={testing || !settings.calendar_id}>
                {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verbindung testen (14 Tage)
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={disconnecting}>
                    Verbindung trennen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Google-Kalender trennen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      OAuth-Daten und Tokens werden entfernt. Buchungen werden nicht mehr durch den
                      Kalender blockiert.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect}>Trennen</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {testPreview && (
              <div className="rounded-lg border border-sage-200 bg-sage-50/60 p-4 text-sm max-w-xl">
                <p className="font-medium text-sage-900 mb-2">
                  Blockierte Tage (Vorschau): {testPreview.length}
                </p>
                {testPreview.length > 0 ? (
                  <p className="text-sage-700">{testPreview.join(', ')}</p>
                ) : (
                  <p className="text-sage-600">Keine blockierten Tage im Testzeitraum.</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
