'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { Plus, Trash2, Upload } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import {
  SIDEBAR_AD_FORMAT,
  SIDEBAR_AD_FORMAT_RECOMMENDATIONS,
  type AdFormat,
  type AdLinkTarget,
  type AdRotationSettings,
  type PortalAd,
} from '@/lib/portal-ads'
import { SidebarAdFormatRecommendations } from '@/components/admin/sidebar-ad-format-recommendations'

type AdDraft = {
  title: string
  image_url: string
  link_url: string
  link_target: AdLinkTarget
  sort_order: string
  is_active: boolean
  starts_at: string
  ends_at: string
}

const emptyAdDraft = (): AdDraft => ({
  title: '',
  image_url: '',
  link_url: '',
  link_target: '_blank',
  sort_order: '0',
  is_active: false,
  starts_at: '',
  ends_at: '',
})

function toDatetimeLocalValue(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function resolveSidebarFormat(formats: AdFormat[]): AdFormat | null {
  return (
    formats.find((format) => format.slug === SIDEBAR_AD_FORMAT.slug && format.is_active) ||
    formats.find((format) => format.is_active) ||
    null
  )
}

async function uploadAdImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await authenticatedFetch('/api/admin/ads/upload', {
    method: 'POST',
    body: formData,
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Fehler beim Bild-Upload')
  }
  return data.url as string
}

export function PortalAdsManager() {
  const { toast } = useToast()
  const [ads, setAds] = useState<PortalAd[]>([])
  const [sidebarFormat, setSidebarFormat] = useState<AdFormat | null>(null)
  const [settings, setSettings] = useState<AdRotationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingAdId, setSavingAdId] = useState<string | null>(null)
  const [creatingAd, setCreatingAd] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  const [newAd, setNewAd] = useState<AdDraft>(emptyAdDraft())
  const [adEdits, setAdEdits] = useState<Record<string, AdDraft>>({})
  const [rotationDraft, setRotationDraft] = useState({
    interval_seconds: '8',
    is_enabled: true,
  })

  const primaryRecommendation =
    SIDEBAR_AD_FORMAT_RECOMMENDATIONS.find((format) => format.recommended) ||
    SIDEBAR_AD_FORMAT_RECOMMENDATIONS[0]

  const previewWidth = sidebarFormat?.width_px ?? primaryRecommendation.width_px
  const previewHeight = sidebarFormat?.height_px ?? primaryRecommendation.height_px

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [adsRes, formatsRes, settingsRes] = await Promise.all([
        authenticatedFetch('/api/admin/ads'),
        authenticatedFetch('/api/admin/ad-formats'),
        authenticatedFetch('/api/admin/ad-settings'),
      ])

      const adsData = await adsRes.json()
      const formatsData = await formatsRes.json()
      const settingsData = await settingsRes.json()

      if (!adsRes.ok) throw new Error(adsData.error || 'Fehler beim Laden der Werbeanzeigen')
      if (!formatsRes.ok) throw new Error(formatsData.error || 'Fehler beim Laden des Formats')
      if (!settingsRes.ok) {
        throw new Error(settingsData.error || 'Fehler beim Laden der Rotations-Einstellungen')
      }

      const adsList = (adsData.ads || []) as PortalAd[]
      const formatsList = (formatsData.formats || []) as AdFormat[]
      const settingsValue = (settingsData.settings || null) as AdRotationSettings | null
      const format = resolveSidebarFormat(formatsList)

      setAds(adsList)
      setSidebarFormat(format)
      setSettings(settingsValue)
      setAdEdits(
        Object.fromEntries(
          adsList.map((ad) => [
            ad.id,
            {
              title: ad.title,
              image_url: ad.image_url,
              link_url: ad.link_url || '',
              link_target: ad.link_target,
              sort_order: String(ad.sort_order),
              is_active: ad.is_active,
              starts_at: toDatetimeLocalValue(ad.starts_at),
              ends_at: toDatetimeLocalValue(ad.ends_at),
            },
          ])
        )
      )
      setRotationDraft({
        interval_seconds: String(settingsValue?.interval_seconds ?? 8),
        is_enabled: settingsValue?.is_enabled ?? true,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Laden',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  async function handleCreateAd() {
    if (!sidebarFormat) {
      toast({
        title: 'Fehler',
        description: 'Sidebar-Format nicht verfügbar',
        variant: 'destructive',
      })
      return
    }

    const title = newAd.title.trim()
    if (!title) {
      toast({ title: 'Fehler', description: 'Titel ist erforderlich', variant: 'destructive' })
      return
    }
    if (!newAd.image_url.trim()) {
      toast({ title: 'Fehler', description: 'Bild ist erforderlich', variant: 'destructive' })
      return
    }

    setCreatingAd(true)
    try {
      const response = await authenticatedFetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          format_id: sidebarFormat.id,
          image_url: newAd.image_url.trim(),
          link_url: newAd.link_url.trim() || null,
          link_target: newAd.link_target,
          sort_order: Number(newAd.sort_order) || 0,
          is_active: newAd.is_active,
          starts_at: fromDatetimeLocalValue(newAd.starts_at),
          ends_at: fromDatetimeLocalValue(newAd.ends_at),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Erstellen')

      toast({ title: 'Erfolg', description: 'Werbeanzeige angelegt' })
      setNewAd(emptyAdDraft())
      await loadAll()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Erstellen',
        variant: 'destructive',
      })
    } finally {
      setCreatingAd(false)
    }
  }

  async function handleSaveAd(adId: string) {
    if (!sidebarFormat) return

    const edit = adEdits[adId]
    if (!edit) return

    const title = edit.title.trim()
    if (!title) {
      toast({ title: 'Fehler', description: 'Titel ist erforderlich', variant: 'destructive' })
      return
    }
    if (!edit.image_url.trim()) {
      toast({ title: 'Fehler', description: 'Bild ist erforderlich', variant: 'destructive' })
      return
    }

    setSavingAdId(adId)
    try {
      const response = await authenticatedFetch(`/api/admin/ads/${adId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          format_id: sidebarFormat.id,
          image_url: edit.image_url.trim(),
          link_url: edit.link_url.trim() || null,
          link_target: edit.link_target,
          sort_order: Number(edit.sort_order) || 0,
          is_active: edit.is_active,
          starts_at: fromDatetimeLocalValue(edit.starts_at),
          ends_at: fromDatetimeLocalValue(edit.ends_at),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Speichern')

      toast({ title: 'Erfolg', description: 'Werbeanzeige gespeichert' })
      await loadAll()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setSavingAdId(null)
    }
  }

  async function handleDeleteAd(adId: string) {
    if (!window.confirm('Werbeanzeige wirklich löschen?')) return

    try {
      const response = await authenticatedFetch(`/api/admin/ads/${adId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Löschen')

      toast({ title: 'Erfolg', description: 'Werbeanzeige gelöscht' })
      await loadAll()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Löschen',
        variant: 'destructive',
      })
    }
  }

  async function handleImageUpload(target: 'new' | string, file: File | null) {
    if (!file) return

    setUploadingFor(target)
    try {
      const url = await uploadAdImage(file)
      if (target === 'new') {
        setNewAd((current) => ({ ...current, image_url: url }))
      } else {
        setAdEdits((current) => ({
          ...current,
          [target]: { ...current[target], image_url: url },
        }))
      }
      toast({ title: 'Erfolg', description: 'Bild hochgeladen' })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Bild-Upload',
        variant: 'destructive',
      })
    } finally {
      setUploadingFor(null)
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      const response = await authenticatedFetch('/api/admin/ad-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interval_seconds: Number(rotationDraft.interval_seconds) || 8,
          is_enabled: rotationDraft.is_enabled,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Speichern')

      toast({ title: 'Erfolg', description: 'Rotations-Einstellungen gespeichert' })
      setSettings(data.settings)
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setSavingSettings(false)
    }
  }

  function renderAdFields(
    draft: AdDraft,
    onChange: (next: AdDraft) => void,
    uploadKey: 'new' | string
  ) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Titel (Alt-Text)</Label>
          <Input
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Bild</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={draft.image_url}
              onChange={(event) => onChange({ ...draft, image_url: event.target.value })}
              placeholder="Bild-URL"
            />
            <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <Upload className="h-4 w-4" />
              {uploadingFor === uploadKey ? 'Lädt…' : 'Hochladen'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingFor === uploadKey}
                onChange={(event) => {
                  void handleImageUpload(uploadKey, event.target.files?.[0] || null)
                  event.target.value = ''
                }}
              />
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Siehe Format-Empfehlungen oben – ideal: {primaryRecommendation.width_px}×
            {primaryRecommendation.height_px} px ({primaryRecommendation.aspect_ratio})
          </p>
          {draft.image_url && (
            <div className="mt-2 max-w-xs overflow-hidden rounded-md border bg-white p-2">
              <Image
                src={draft.image_url}
                alt={draft.title || 'Vorschau'}
                width={previewWidth}
                height={previewHeight}
                className="h-auto w-full rounded object-cover"
                unoptimized
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Link (optional)</Label>
          <Input
            value={draft.link_url}
            onChange={(event) => onChange({ ...draft, link_url: event.target.value })}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-2">
          <Label>Link-Ziel</Label>
          <Select
            value={draft.link_target}
            onValueChange={(value: AdLinkTarget) => onChange({ ...draft, link_target: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_blank">Neuer Tab</SelectItem>
              <SelectItem value="_self">Gleicher Tab</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Reihenfolge</Label>
          <Input
            type="number"
            value={draft.sort_order}
            onChange={(event) => onChange({ ...draft, sort_order: event.target.value })}
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch
            checked={draft.is_active}
            onCheckedChange={(checked) => onChange({ ...draft, is_active: checked })}
          />
          <Label>Aktiv</Label>
        </div>
        <div className="space-y-2">
          <Label>Sichtbar ab (optional)</Label>
          <Input
            type="datetime-local"
            value={draft.starts_at}
            onChange={(event) => onChange({ ...draft, starts_at: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Sichtbar bis (optional)</Label>
          <Input
            type="datetime-local"
            value={draft.ends_at}
            onChange={(event) => onChange({ ...draft, ends_at: event.target.value })}
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return <p className="text-sage-600">Lade Werbebanner…</p>
  }

  return (
    <Tabs defaultValue="ads" className="space-y-6">
      <TabsList>
        <TabsTrigger value="ads">Werbeanzeigen</TabsTrigger>
        <TabsTrigger value="rotation">Rotation</TabsTrigger>
      </TabsList>

      <TabsContent value="ads" className="space-y-6">
        <SidebarAdFormatRecommendations />

        <Card>
          <CardHeader>
            <CardTitle>Sidebar-Banner</CardTitle>
            <CardDescription>
              Werbeanzeigen für die Kundenportal-Sidebar. Mehrere aktive Anzeigen rotieren
              automatisch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!sidebarFormat ? (
              <p className="text-sm text-destructive">
                Das Sidebar-Format fehlt in der Datenbank. Bitte die Migration erneut anwenden.
              </p>
            ) : (
              <>
                {renderAdFields(newAd, setNewAd, 'new')}
                <Button onClick={() => void handleCreateAd()} disabled={creatingAd}>
                  <Plus className="mr-2 h-4 w-4" />
                  {creatingAd ? 'Wird angelegt…' : 'Anzeige anlegen'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {ads.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Noch keine Werbeanzeigen vorhanden.
              </CardContent>
            </Card>
          ) : (
            ads.map((ad) => {
              const edit = adEdits[ad.id]
              if (!edit) return null

              return (
                <Card key={ad.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{ad.title}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        <Badge variant={ad.is_active ? 'default' : 'secondary'}>
                          {ad.is_active ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                        <span>Reihenfolge {ad.sort_order}</span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDeleteAd(ad.id)}
                      aria-label="Werbeanzeige löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderAdFields(edit, (next) => {
                      setAdEdits((current) => ({ ...current, [ad.id]: next }))
                    }, ad.id)}
                    <Button
                      onClick={() => void handleSaveAd(ad.id)}
                      disabled={savingAdId === ad.id || !sidebarFormat}
                    >
                      {savingAdId === ad.id ? 'Speichern…' : 'Speichern'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </TabsContent>

      <TabsContent value="rotation">
        <Card>
          <CardHeader>
            <CardTitle>Rotation</CardTitle>
            <CardDescription>
              Werbeanzeigen wechseln im festen Intervall und zusätzlich bei jedem Seitenwechsel im
              Kundenportal. Bei deaktivierter Rotation bleibt die erste Anzeige statisch sichtbar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={rotationDraft.is_enabled}
                onCheckedChange={(checked) =>
                  setRotationDraft((current) => ({ ...current, is_enabled: checked }))
                }
              />
              <Label>Rotation aktiv</Label>
            </div>
            <div className="max-w-xs space-y-2">
              <Label>Intervall (Sekunden)</Label>
              <Input
                type="number"
                min={3}
                max={60}
                value={rotationDraft.interval_seconds}
                onChange={(event) =>
                  setRotationDraft((current) => ({
                    ...current,
                    interval_seconds: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">Zulässig: 3–60 Sekunden</p>
            </div>
            {settings && (
              <p className="text-sm text-muted-foreground">
                Aktuell: {settings.is_enabled ? 'aktiv' : 'inaktiv'} ·{' '}
                {settings.interval_seconds} Sekunden
              </p>
            )}
            <Button onClick={() => void handleSaveSettings()} disabled={savingSettings}>
              {savingSettings ? 'Speichern…' : 'Einstellungen speichern'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
