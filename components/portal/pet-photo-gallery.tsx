'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { uploadPetPhotoDirect } from '@/lib/portal-pet-photo-upload'
import { readApiResponse } from '@/lib/read-api-response'
import { MAX_PET_PHOTOS, validatePetPhotoFile } from '@/lib/pet-photos'
import type { PetPhoto } from '@/lib/types'

type PendingPhoto = {
  id: string
  file: File
  previewUrl: string
}

export type PetPhotoGalleryHandle = {
  flushPendingUploads: (petId: string) => Promise<number>
}

type PetPhotoGalleryProps = {
  petId: string | null
  readOnly?: boolean
  apiBase?: 'portal' | 'admin'
  onPhotoCountChange?: (count: number) => void
}

async function uploadPetPhotoViaApi(
  petId: string,
  file: File,
  apiBase: 'portal' | 'admin'
): Promise<PetPhoto> {
  const formData = new FormData()
  formData.append('file', file)

  const endpoint =
    apiBase === 'admin'
      ? `/api/admin/pets/${petId}/photos`
      : `/api/portal/pets/${petId}/photos`

  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    body: formData,
  })
  const { data, error } = await readApiResponse<{ photo?: PetPhoto; error?: string }>(response)
  if (error) {
    throw new Error(error)
  }
  if (!data?.photo) {
    throw new Error('Upload fehlgeschlagen')
  }
  return data.photo
}

export const PetPhotoGallery = forwardRef<PetPhotoGalleryHandle, PetPhotoGalleryProps>(
  function PetPhotoGallery(
    { petId, readOnly = false, apiBase = 'portal', onPhotoCountChange },
    ref
  ) {
    const { toast } = useToast()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const onPhotoCountChangeRef = useRef(onPhotoCountChange)
    const [photos, setPhotos] = useState<PetPhoto[]>([])
    const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
      onPhotoCountChangeRef.current = onPhotoCountChange
    }, [onPhotoCountChange])

    const totalCount = photos.length + pendingPhotos.length

    useEffect(() => {
      onPhotoCountChangeRef.current?.(totalCount)
    }, [totalCount])

    const photosEndpoint = petId
      ? apiBase === 'admin'
        ? `/api/admin/pets/${petId}/photos`
        : `/api/portal/pets/${petId}/photos`
      : null

    useEffect(() => {
      if (!photosEndpoint) {
        setPhotos([])
        return
      }

      let cancelled = false

      async function loadPhotos() {
        setLoading(true)
        try {
          const response = await authenticatedFetch(photosEndpoint!)
          const { data, error } = await readApiResponse<{ photos?: PetPhoto[]; error?: string }>(
            response
          )
          if (error) {
            throw new Error(error)
          }
          if (!cancelled) {
            setPhotos(data?.photos || [])
          }
        } catch (error) {
          console.error('Error loading pet photos:', error)
        } finally {
          if (!cancelled) setLoading(false)
        }
      }

      loadPhotos()
      return () => {
        cancelled = true
      }
    }, [photosEndpoint])

    const flushPendingUploads = useCallback(
      async (targetPetId: string): Promise<number> => {
        if (readOnly || apiBase !== 'portal' || pendingPhotos.length === 0) {
          return photos.length + pendingPhotos.length
        }

        setUploading(true)
        const uploaded: PetPhoto[] = []

        try {
          for (const pending of pendingPhotos) {
            const photo = await uploadPetPhotoDirect(targetPetId, pending.file)
            uploaded.push(photo)
            URL.revokeObjectURL(pending.previewUrl)
          }

          setPendingPhotos([])
          const nextCount = photos.length + uploaded.length
          setPhotos((current) => [...current, ...uploaded])
          return nextCount
        } catch (error) {
          toast({
            title: 'Fehler',
            description:
              error instanceof Error ? error.message : 'Fotos konnten nicht hochgeladen werden',
            variant: 'destructive',
          })
          throw error
        } finally {
          setUploading(false)
        }
      },
      [apiBase, pendingPhotos, photos.length, readOnly, toast]
    )

    useImperativeHandle(ref, () => ({ flushPendingUploads }), [flushPendingUploads])

    async function handleUpload(file: File) {
      if (readOnly) return

      const validationError = validatePetPhotoFile(file)
      if (validationError) {
        toast({ title: 'Fehler', description: validationError, variant: 'destructive' })
        return
      }

      if (totalCount >= MAX_PET_PHOTOS) {
        toast({
          title: 'Limit erreicht',
          description: `Maximal ${MAX_PET_PHOTOS} Fotos pro Tier.`,
          variant: 'destructive',
        })
        return
      }

      if (!petId) {
        const pending: PendingPhoto = {
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        }
        setPendingPhotos((current) => [...current, pending])
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setUploading(true)
      try {
        const photo =
          apiBase === 'portal'
            ? await uploadPetPhotoDirect(petId, file)
            : await uploadPetPhotoViaApi(petId, file, apiBase)

        setPhotos((current) => [...current, photo])
        toast({ title: 'Foto hochgeladen' })
      } catch (error) {
        toast({
          title: 'Fehler',
          description: error instanceof Error ? error.message : 'Upload fehlgeschlagen',
          variant: 'destructive',
        })
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }

    async function handleDeleteSaved(photoId: string) {
      if (!petId || readOnly) return

      setDeletingId(photoId)
      try {
        const response = await authenticatedFetch(`/api/portal/pets/${petId}/photos/${photoId}`, {
          method: 'DELETE',
        })
        const { error } = await readApiResponse(response)
        if (error) {
          throw new Error(error)
        }

        setPhotos((current) => current.filter((photo) => photo.id !== photoId))
        toast({ title: 'Foto gelöscht' })
      } catch (error) {
        toast({
          title: 'Fehler',
          description: error instanceof Error ? error.message : 'Löschen fehlgeschlagen',
          variant: 'destructive',
        })
      } finally {
        setDeletingId(null)
      }
    }

    function handleDeletePending(pendingId: string) {
      setPendingPhotos((current) => {
        const item = current.find((photo) => photo.id === pendingId)
        if (item) URL.revokeObjectURL(item.previewUrl)
        return current.filter((photo) => photo.id !== pendingId)
      })
    }

    const showMissingHint = !readOnly && !loading && totalCount === 0
    const canAddPhotos = !readOnly && apiBase === 'portal' && totalCount < MAX_PET_PHOTOS

    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label>Tierfotos</Label>
            <p className="text-sm text-sage-600 mt-1">
              {readOnly
                ? 'Vom Kunden hochgeladene Fotos zur Wiedererkennung.'
                : `Bis zu ${MAX_PET_PHOTOS} Fotos – hilfreich bei mehreren Tieren gleicher Rasse oder Farbe.`}
            </p>
          </div>
          {canAddPhotos && (
            <>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleUpload(file)
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ImagePlus className="h-4 w-4 mr-2" />
                )}
                Foto hinzufügen
              </Button>
            </>
          )}
        </div>

        {!petId && !readOnly && pendingPhotos.length > 0 && (
          <p className="text-sm text-sage-600 bg-sage-50 border border-sage-200 rounded-md px-3 py-2">
            Die ausgewählten Fotos werden beim Speichern des Tieres automatisch hochgeladen.
          </p>
        )}

        {showMissingHint && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Noch kein Foto hinterlegt. Bitte lade mindestens ein Bild hoch, damit wir dein Tier
            sicher wiedererkennen.
          </p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-sage-600 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fotos werden geladen…
          </div>
        ) : totalCount > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pendingPhotos.map((pending) => (
              <div
                key={pending.id}
                className="relative aspect-square overflow-hidden rounded-lg border border-dashed border-sage-300 bg-sage-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pending.previewUrl}
                  alt={pending.file.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                  Wird mitgespeichert
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => handleDeletePending(pending.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-lg border border-sage-200 bg-sage-50"
              >
                {photo.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.signedUrl}
                    alt={photo.file_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-sage-500 px-2 text-center">
                    Vorschau nicht verfügbar
                  </div>
                )}
                {!readOnly && apiBase === 'portal' && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8"
                    disabled={deletingId === photo.id}
                    onClick={() => void handleDeleteSaved(photo.id)}
                  >
                    {deletingId === photo.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : petId && !loading ? (
          <p className="text-sm text-sage-500 py-2">
            {readOnly ? 'Keine Fotos vorhanden.' : 'Noch keine Fotos hochgeladen.'}
          </p>
        ) : null}
      </div>
    )
  }
)
