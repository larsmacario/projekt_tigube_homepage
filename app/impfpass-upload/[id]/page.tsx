'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, CheckCircle2, Loader2, Upload } from 'lucide-react'
import {
  IMPFPASS_CATEGORY_LABELS,
  IMPFPASS_EXAMPLE_IMAGES,
  IMPFPASS_PAGE_CATEGORIES,
  MAX_IMPFASS_PHOTOS,
  type ImpfpassPageCategory,
} from '@/lib/impfpass-photo-categories'
import type { ImpfpassUploadSession, ImpfpassUploadSessionItem } from '@/lib/impfpass-upload-session'

export default function ImpfpassUploadMobilePage() {
  const params = useParams()
  const sessionId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState<ImpfpassUploadSession | null>(null)
  const [pageCategory, setPageCategory] = useState<ImpfpassPageCategory>('sonstiges')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [lastUploadSuccess, setLastUploadSuccess] = useState(false)

  async function loadSession() {
    try {
      const response = await fetch(`/api/portal/impfpass-upload/session?id=${sessionId}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Upload-Session ungültig')
      }
      setSession(data.session)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verbindungsfehler')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionId) {
      void loadSession()
    }
  }, [sessionId])

  const itemCount = session?.items?.length ?? 0
  const canAdd = itemCount < MAX_IMPFASS_PHOTOS && session?.status === 'active'

  async function handleUpload(file: File) {
    if (!canAdd) return

    setUploading(true)
    setLastUploadSuccess(false)

    try {
      const formData = new FormData()
      formData.append('session_id', sessionId)
      formData.append('file', file)
      formData.append('page_category', pageCategory)
      if (description.trim()) {
        formData.append('description', description.trim())
      }

      const response = await fetch('/api/portal/impfpass-upload/session/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Upload fehlgeschlagen')
      }

      setSelectedFile(null)
      setDescription('')
      setLastUploadSuccess(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      await loadSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(file: File | undefined) {
    if (!file) return
    setSelectedFile(file)
    setLastUploadSuccess(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-sage-600" />
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 text-center">Fehler</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sage-700">{error}</p>
            <Button onClick={() => { setError(''); setLoading(true); void loadSession() }}>
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (session?.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Session abgelaufen</CardTitle>
            <CardDescription className="text-center">
              Bitte generiere am Computer einen neuen QR-Code.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sage-50 px-4 py-6 pb-10">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">
            Impfpass vom Smartphone
          </p>
          <h1 className="text-xl font-semibold text-sage-900">Fotos hochladen</h1>
          <p className="text-sm text-sage-600">
            Fotografiere die Impfpass-Seiten einzeln und lade sie hier hoch. Am Computer siehst du
            die Bilder automatisch.
          </p>
        </div>

        <div className="rounded-xl border border-sage-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium text-sage-900">Beispiele</p>
          <div className="grid grid-cols-3 gap-2">
            {IMPFPASS_EXAMPLE_IMAGES.map((example) => (
              <button
                key={example.category}
                type="button"
                onClick={() => setPageCategory(example.category)}
                className={`rounded-lg overflow-hidden border text-left transition-colors ${
                  pageCategory === example.category
                    ? 'border-sage-600 ring-2 ring-sage-300'
                    : 'border-sage-200'
                }`}
              >
                <div className="relative aspect-square bg-sage-100">
                  <Image src={example.src} alt={example.label} fill className="object-cover" sizes="120px" />
                </div>
                <p className="p-1.5 text-[10px] leading-tight text-sage-700">{example.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border-2 border-sage-300 bg-white p-4 space-y-4">
          <div>
            <Label>Kategorie</Label>
            <Select
              value={pageCategory}
              onValueChange={(value) => setPageCategory(value as ImpfpassPageCategory)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPFPASS_PAGE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {IMPFPASS_CATEGORY_LABELS[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="mobile-description">Zusätzliche Beschreibung (optional)</Label>
            <Textarea
              id="mobile-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="z. B. Tollwutimpfung 2024"
              rows={2}
              className="mt-1"
            />
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*,application/pdf"
            className="hidden"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              disabled={!canAdd || uploading}
              className="bg-sage-600 hover:bg-sage-700 h-12"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-5 w-5 mr-2" />
              Foto aufnehmen
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canAdd || uploading}
              className="h-12"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 mr-2" />
              Aus Galerie wählen
            </Button>
          </div>

          {selectedFile && (
            <div className="rounded-lg bg-sage-50 border border-sage-200 px-3 py-2 text-sm text-sage-700">
              Ausgewählt: {selectedFile.name}
            </div>
          )}

          <Button
            type="button"
            disabled={!selectedFile || !canAdd || uploading}
            className="w-full bg-sage-700 hover:bg-sage-800 h-12 text-base"
            onClick={() => selectedFile && void handleUpload(selectedFile)}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Upload className="h-5 w-5 mr-2" />
            )}
            Jetzt hochladen
          </Button>

          {lastUploadSuccess && (
            <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Foto hochgeladen – am Computer sofort sichtbar.
            </p>
          )}

          {error && session && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {itemCount > 0 && (
          <div className="rounded-xl border border-sage-200 bg-white p-4 space-y-3">
            <p className="font-medium text-sage-900">
              Hochgeladen ({itemCount}/{MAX_IMPFASS_PHOTOS})
            </p>
            <div className="space-y-2">
              {(session?.items || []).map((item: ImpfpassUploadSessionItem) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-sage-100 bg-sage-50 p-2"
                >
                  {item.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.signedUrl}
                      alt={item.file_name}
                      className="h-14 w-14 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-md bg-sage-200 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-sage-900 truncate">
                      {IMPFPASS_CATEGORY_LABELS[item.page_category ?? 'sonstiges']}
                    </p>
                    {item.description && (
                      <p className="text-xs text-sage-600 truncate">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-sage-500">
          Du kannst dieses Fenster offen lassen und weitere Seiten hochladen.
        </p>
      </div>
    </div>
  )
}
