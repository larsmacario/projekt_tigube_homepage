'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import Image from 'next/image'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronDown, Camera, FileText, ImagePlus, Loader2, Smartphone, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { readApiResponse } from '@/lib/read-api-response'
import {
  IMPFPASS_CATEGORY_LABELS,
  IMPFPASS_EXAMPLE_IMAGES,
  IMPFPASS_PAGE_CATEGORIES,
  MAX_IMPFASS_PHOTOS,
  type ImpfpassPageCategory,
} from '@/lib/impfpass-photo-categories'
import {
  deletePortalDocument,
  fetchPortalDocumentSignedUrl,
  updatePortalDocumentMetadata,
  uploadPortalDocument,
} from '@/lib/portal-document-upload'
import {
  getImpfpassUploadMobileUrl,
  getImpfpassUploadQrCodeUrl,
  type ImpfpassUploadSessionItem,
} from '@/lib/impfpass-upload-session'
import type { Document } from '@/lib/types'

type PendingImpfpassPhoto = {
  id: string
  file: File
  previewUrl: string | null
  pageCategory: ImpfpassPageCategory
  description: string
}

export type PetImpfpassGalleryHandle = {
  flushPendingUploads: (petId: string) => Promise<number>
  getPendingCount: () => number
}

type PetImpfpassGalleryProps = {
  petId: string | null
  documents: Document[]
  onDocumentsChange?: (documents: Document[]) => void
  onImpfpassCountChange?: (count: number) => void
  /** documents: Dokumente-Seite – Beispiele immer sichtbar, ohne Einführungsbox */
  variant?: 'pet-form' | 'documents'
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export const PetImpfpassGallery = forwardRef<PetImpfpassGalleryHandle, PetImpfpassGalleryProps>(
  function PetImpfpassGallery(
    { petId, documents, onDocumentsChange, onImpfpassCountChange, variant = 'pet-form' },
    ref
  ) {
    const { toast } = useToast()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const onImpfpassCountChangeRef = useRef(onImpfpassCountChange)

    const savedImpfpassDocs = useMemo(
      () =>
        petId
          ? documents.filter(
              (doc) => doc.document_type === 'impfpass' && doc.pet_id === petId
            )
          : [],
      [documents, petId]
    )

    const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
    const [pendingPhotos, setPendingPhotos] = useState<PendingImpfpassPhoto[]>([])
    const [uploading, setUploading] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
    const [pendingFile, setPendingFile] = useState<File | null>(null)
    const [uploadCategory, setUploadCategory] = useState<ImpfpassPageCategory>('sonstiges')
    const [uploadDescription, setUploadDescription] = useState('')
    const [editDoc, setEditDoc] = useState<Document | null>(null)
    const [editCategory, setEditCategory] = useState<ImpfpassPageCategory>('sonstiges')
    const [editDescription, setEditDescription] = useState('')
    const [savingEdit, setSavingEdit] = useState(false)
    const [mobileSessionId, setMobileSessionId] = useState<string | null>(null)
    const [mobileSessionLoading, setMobileSessionLoading] = useState(false)
    const [isPollingMobile, setIsPollingMobile] = useState(false)
    const [qrDialogOpen, setQrDialogOpen] = useState(false)
    const [sessionPendingItems, setSessionPendingItems] = useState<ImpfpassUploadSessionItem[]>([])
    const lastMobileItemCountRef = useRef(0)

    const totalCount =
      savedImpfpassDocs.length + pendingPhotos.length + sessionPendingItems.length
    const isDocumentsVariant = variant === 'documents'
    const [examplesOpen, setExamplesOpen] = useState(isDocumentsVariant)

    useEffect(() => {
      onImpfpassCountChangeRef.current = onImpfpassCountChange
    }, [onImpfpassCountChange])

    useEffect(() => {
      onImpfpassCountChangeRef.current?.(totalCount)
    }, [totalCount])

    useEffect(() => {
      let cancelled = false

      async function loadPreviews() {
        const entries = await Promise.all(
          savedImpfpassDocs.map(async (doc) => {
            if (!doc.mime_type?.startsWith('image/')) {
              return [doc.id, ''] as const
            }
            const { signedUrl, error } = await fetchPortalDocumentSignedUrl(doc.id)
            if (error || !signedUrl) return [doc.id, ''] as const
            return [doc.id, signedUrl] as const
          })
        )

        if (!cancelled) {
          setPreviewUrls(Object.fromEntries(entries.filter(([, url]) => url)))
        }
      }

      void loadPreviews()
      return () => {
        cancelled = true
      }
    }, [savedImpfpassDocs])

    async function refreshDocumentsFromApi() {
      const docsResponse = await authenticatedFetch('/api/portal/documents')
      const docsResult = await readApiResponse<{ documents?: Document[] }>(docsResponse)
      if (!docsResult.error && docsResult.data?.documents) {
        onDocumentsChange?.(docsResult.data.documents)
      }
    }

    async function pollMobileSession() {
      if (!mobileSessionId) return

      const response = await authenticatedFetch(
        `/api/portal/impfpass-upload/session?id=${mobileSessionId}`
      )
      const { data, error } = await readApiResponse<{
        session?: {
          status: string
          items?: ImpfpassUploadSessionItem[]
        }
      }>(response)

      if (error || !data?.session) return

      if (data.session.status === 'expired') {
        setIsPollingMobile(false)
        setMobileSessionId(null)
        setQrDialogOpen(false)
        toast({
          title: 'QR-Code abgelaufen',
          description: 'Bitte generiere einen neuen QR-Code.',
          variant: 'destructive',
        })
        return
      }

      const items = data.session.items || []
      const pendingItems = items.filter((item) => !item.document_id)
      setSessionPendingItems(pendingItems)

      if (items.length > lastMobileItemCountRef.current) {
        lastMobileItemCountRef.current = items.length
        if (petId) {
          await refreshDocumentsFromApi()
        }
        toast({
          title: 'Neues Foto vom Smartphone',
          description: 'Ein Impfpass-Foto wurde empfangen.',
        })
      }
    }

    useEffect(() => {
      if (!mobileSessionId || !isPollingMobile) return

      void pollMobileSession()
      const interval = setInterval(() => {
        void pollMobileSession()
      }, 3000)

      return () => clearInterval(interval)
    }, [mobileSessionId, isPollingMobile, petId])

    async function startMobileUpload() {
      if (mobileSessionId) {
        setQrDialogOpen(true)
        return
      }

      setMobileSessionLoading(true)
      try {
        const response = await authenticatedFetch('/api/portal/impfpass-upload/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pet_id: petId }),
        })
        const { data, error } = await readApiResponse<{ session?: { id: string } }>(response)
        if (error || !data?.session?.id) {
          throw new Error(error || 'QR-Code konnte nicht erstellt werden')
        }

        setMobileSessionId(data.session.id)
        setIsPollingMobile(true)
        setQrDialogOpen(true)
        lastMobileItemCountRef.current = sessionPendingItems.length
      } catch (error) {
        toast({
          title: 'Fehler',
          description: error instanceof Error ? error.message : 'QR-Code fehlgeschlagen',
          variant: 'destructive',
        })
      } finally {
        setMobileSessionLoading(false)
      }
    }

    function endMobileUploadSession() {
      setMobileSessionId(null)
      setIsPollingMobile(false)
      setSessionPendingItems([])
      setQrDialogOpen(false)
    }

    const flushPendingUploads = useCallback(
      async (targetPetId: string): Promise<number> => {
        if (pendingPhotos.length === 0 && !mobileSessionId) {
          return savedImpfpassDocs.length + sessionPendingItems.length
        }

        setUploading(true)
        const uploaded: Document[] = []

        try {
          for (const pending of pendingPhotos) {
            const { document, error } = await uploadPortalDocument({
              file: pending.file,
              documentType: 'impfpass',
              petId: targetPetId,
              pageCategory: pending.pageCategory,
              description: pending.description,
            })
            if (error || !document) {
              throw new Error(error || 'Upload fehlgeschlagen')
            }
            uploaded.push(document)
            if (pending.previewUrl) {
              URL.revokeObjectURL(pending.previewUrl)
            }
          }

          setPendingPhotos([])

          if (mobileSessionId) {
            const response = await authenticatedFetch('/api/portal/impfpass-upload/session', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: mobileSessionId, pet_id: targetPetId }),
            })
            const { error } = await readApiResponse(response)
            if (error) {
              throw new Error(error)
            }
            setSessionPendingItems([])
          }

          await refreshDocumentsFromApi()

          const docsResponse = await authenticatedFetch('/api/portal/documents')
          const docsResult = await readApiResponse<{ documents?: Document[] }>(docsResponse)
          const allDocs = docsResult.data?.documents || documents
          return allDocs.filter(
            (doc) => doc.document_type === 'impfpass' && doc.pet_id === targetPetId
          ).length
        } catch (error) {
          toast({
            title: 'Fehler',
            description:
              error instanceof Error
                ? error.message
                : 'Impfpass-Fotos konnten nicht hochgeladen werden',
            variant: 'destructive',
          })
          throw error
        } finally {
          setUploading(false)
        }
      },
      [documents, mobileSessionId, pendingPhotos, savedImpfpassDocs.length, sessionPendingItems.length, toast]
    )

    useImperativeHandle(
      ref,
      () => ({
        flushPendingUploads,
        getPendingCount: () => pendingPhotos.length + sessionPendingItems.length,
      }),
      [flushPendingUploads, pendingPhotos.length, sessionPendingItems.length]
    )

    function openUploadDialog(category?: ImpfpassPageCategory) {
      setPendingFile(null)
      setUploadCategory(category ?? 'sonstiges')
      setUploadDescription('')
      setUploadDialogOpen(true)
    }

    function handleFileSelected(file: File) {
      if (totalCount >= MAX_IMPFASS_PHOTOS) {
        toast({
          title: 'Limit erreicht',
          description: `Maximal ${MAX_IMPFASS_PHOTOS} Impfpass-Fotos pro Tier.`,
          variant: 'destructive',
        })
        return
      }

      setPendingFile(file)
      setUploadDialogOpen(true)
    }

    async function handleConfirmUpload() {
      if (!pendingFile) return

      const pending: PendingImpfpassPhoto = {
        id: crypto.randomUUID(),
        file: pendingFile,
        previewUrl: isImageFile(pendingFile) ? URL.createObjectURL(pendingFile) : null,
        pageCategory: uploadCategory,
        description: uploadDescription.trim(),
      }

      if (petId) {
        setUploading(true)
        try {
          const { document, error } = await uploadPortalDocument({
            file: pending.file,
            documentType: 'impfpass',
            petId,
            pageCategory: pending.pageCategory,
            description: pending.description,
          })
          if (error || !document) {
            throw new Error(error || 'Upload fehlgeschlagen')
          }
          onDocumentsChange?.([document, ...documents])
          toast({ title: 'Impfpass-Seite hochgeladen' })
        } catch (error) {
          toast({
            title: 'Fehler',
            description: error instanceof Error ? error.message : 'Upload fehlgeschlagen',
            variant: 'destructive',
          })
        } finally {
          setUploading(false)
        }
      } else {
        setPendingPhotos((current) => [...current, pending])
      }

      setUploadDialogOpen(false)
      setPendingFile(null)
      setUploadDescription('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    async function handleDeleteSaved(documentId: string) {
      setDeletingId(documentId)
      try {
        const { error } = await deletePortalDocument(documentId)
        if (error) throw new Error(error)

        onDocumentsChange?.(documents.filter((doc) => doc.id !== documentId))
        setPreviewUrls((current) => {
          const next = { ...current }
          delete next[documentId]
          return next
        })
        toast({ title: 'Impfpass-Seite gelöscht' })
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
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
        return current.filter((photo) => photo.id !== pendingId)
      })
    }

    function openEditDialog(doc: Document) {
      setEditDoc(doc)
      setEditCategory(doc.page_category ?? 'sonstiges')
      setEditDescription(doc.description ?? '')
    }

    async function handleSaveEdit() {
      if (!editDoc) return

      setSavingEdit(true)
      try {
        const { document, error } = await updatePortalDocumentMetadata({
          documentId: editDoc.id,
          pageCategory: editCategory,
          description: editDescription,
        })
        if (error || !document) {
          throw new Error(error || 'Speichern fehlgeschlagen')
        }

        onDocumentsChange?.(
          documents.map((doc) => (doc.id === document.id ? document : doc))
        )
        setEditDoc(null)
        toast({ title: 'Beschreibung gespeichert' })
      } catch (error) {
        toast({
          title: 'Fehler',
          description: error instanceof Error ? error.message : 'Speichern fehlgeschlagen',
          variant: 'destructive',
        })
      } finally {
        setSavingEdit(false)
      }
    }

    const canAdd = totalCount < MAX_IMPFASS_PHOTOS

    return (
      <div className="space-y-5">
        {canAdd && petId && (
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) handleFileSelected(file)
            }}
          />
        )}

        {!isDocumentsVariant && (
        <div className="rounded-xl border-2 border-sage-300 bg-gradient-to-br from-sage-50 to-white p-4 sm:p-5 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">
              Impfpass hochladen – in 3 Schritten
            </p>
            <h4 className="text-base font-semibold text-sage-900">
              Bitte fotografiere die wichtigsten Seiten deines Heimtierausweises
            </h4>
            <p className="text-sm text-sage-600">
              Für die Betreuung brauchen wir gut lesbare Fotos einzelner Impfpass-Seiten – nicht
              den ganzen Ausweis auf einmal.
            </p>
          </div>

          <ol className="grid gap-2 sm:grid-cols-3 text-sm">
            <li className="flex gap-2 rounded-lg bg-white border border-sage-200 px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-600 text-xs font-bold text-white">
                1
              </span>
              <span className="text-sage-700">Beispiele unten ansehen</span>
            </li>
            <li className="flex gap-2 rounded-lg bg-white border border-sage-200 px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-600 text-xs font-bold text-white">
                2
              </span>
              <span className="text-sage-700">Seite mit dem Handy fotografieren</span>
            </li>
            <li className="flex gap-2 rounded-lg bg-white border border-sage-200 px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-600 text-xs font-bold text-white">
                3
              </span>
              <span className="text-sage-700">Foto hochladen & Kategorie wählen</span>
            </li>
          </ol>

          {canAdd && (
              <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
                {/* Option A: Direkt am Computer */}
                <div className="flex h-full flex-col rounded-xl border-2 border-dashed border-sage-400 bg-white px-4 py-5 text-left">
                  <div className="flex flex-1 items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white">
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold uppercase tracking-wide text-sage-600">
                        Option A
                      </span>
                      <span className="block text-base font-semibold text-sage-900 mt-1">
                        Am Computer hochladen
                      </span>
                      <p className="mt-1 min-h-[2.5rem] text-sm text-sage-600">
                        Datei vom PC oder Mac auswählen und hochladen.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={uploading}
                    variant="outline"
                    className="mt-auto pt-4 w-full h-11 shrink-0 border-sage-400 hover:bg-sage-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ImagePlus className="h-4 w-4 mr-2" />
                    )}
                    Datei auswählen
                  </Button>
                </div>

                {/* Option B: Smartphone per QR-Code */}
                <div className="flex h-full flex-col rounded-xl border-2 border-sage-400 bg-white px-4 py-5 text-left">
                  <div className="flex flex-1 items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white">
                      <Smartphone className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold uppercase tracking-wide text-sage-600">
                        Option B
                      </span>
                      <span className="block text-base font-semibold text-sage-900 mt-1">
                        Mit dem Smartphone fotografieren
                      </span>
                      <p className="mt-1 min-h-[2.5rem] text-sm text-sage-600">
                        QR-Code scannen, Impfpass mit der Handy-Kamera fotografieren und direkt
                        hochladen.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    disabled={mobileSessionLoading || uploading}
                    className="mt-auto pt-4 w-full h-11 shrink-0 bg-sage-600 hover:bg-sage-700"
                    onClick={() => void startMobileUpload()}
                  >
                    {mobileSessionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Smartphone className="h-4 w-4 mr-2" />
                    )}
                    {mobileSessionId && isPollingMobile ? 'QR-Code öffnen' : 'QR-Code anzeigen'}
                  </Button>
                </div>
              </div>
          )}
        </div>
        )}

        {/* Beispielbilder */}
        <div className="rounded-xl border border-sage-200 bg-white overflow-hidden">
          {!isDocumentsVariant ? (
          <button
            type="button"
            onClick={() => setExamplesOpen((open) => !open)}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-sage-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage-600"
            aria-expanded={examplesOpen}
          >
            <div className="min-w-0">
              <p className="font-semibold text-sage-900">
                Beispiele: So soll dein Foto aussehen
              </p>
              <p className="text-sm text-sage-600 mt-0.5">
                {examplesOpen
                  ? 'Diese 3 Seiten sind besonders wichtig'
                  : 'Tippe hier, um Beispiel-Fotos anzuzeigen'}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2 rounded-lg bg-sage-100 px-3 py-2 text-sm font-medium text-sage-800">
              {examplesOpen ? 'Ausblenden' : 'Beispiele anzeigen'}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${examplesOpen ? 'rotate-180' : ''}`}
              />
            </span>
          </button>
          ) : (
            <div className="px-4 py-4 border-b border-sage-200">
              <p className="font-semibold text-sage-900">Impfpass-Seiten hochladen</p>
              <p className="text-sm text-sage-600 mt-1">
                Fotografiere jede Seite einzeln – flach, gut beleuchtet, ohne Schatten oder
                Spiegelungen.
              </p>
            </div>
          )}

          {(isDocumentsVariant || examplesOpen) && (
            <div className={`px-4 pb-4 space-y-3 ${isDocumentsVariant ? 'pt-4' : 'border-t border-sage-200 pt-4'}`}>
              {!isDocumentsVariant && (
              <p className="text-sm text-sage-600">
                Fotografiere jede Seite einzeln – flach, gut beleuchtet, ohne Schatten oder
                Spiegelungen.
              </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {IMPFPASS_EXAMPLE_IMAGES.map((example) => (
                  <div
                    key={example.category}
                    className="rounded-lg border border-sage-200 overflow-hidden bg-sage-50"
                  >
                    <div className="relative aspect-[4/3] bg-sage-100">
                      <Image
                        src={example.src}
                        alt={example.label}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-sage-900/20 pointer-events-none"
                        aria-hidden
                      >
                        <span className="rounded-md bg-white/95 px-3 py-1.5 text-sm font-semibold tracking-wide text-sage-800 shadow-sm ring-1 ring-sage-200/80">
                          Beispiel
                        </span>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-medium text-sage-900">{example.label}</p>
                      <p className="text-xs text-sage-600">{example.hint}</p>
                      {canAdd && (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="w-full bg-sage-600 hover:bg-sage-700"
                          onClick={() => openUploadDialog(example.category)}
                        >
                          <ImagePlus className="h-4 w-4 mr-2" />
                          Diese Seite hochladen
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isDocumentsVariant && !examplesOpen && (
            <div className="border-t border-sage-200 px-4 py-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {IMPFPASS_EXAMPLE_IMAGES.map((example) => (
                  <div
                    key={example.category}
                    className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-sage-200"
                  >
                    <Image
                      src={example.src}
                      alt={example.label}
                      fill
                      className="object-cover opacity-80"
                      sizes="96px"
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-sage-900/25 pointer-events-none"
                      aria-hidden
                    >
                      <span className="rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-sage-800 shadow-sm">
                        Beispiel
                      </span>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExamplesOpen(true)}
                  className="flex h-16 shrink-0 items-center rounded-md border border-dashed border-sage-300 bg-sage-50 px-3 text-xs font-medium text-sage-700 hover:bg-sage-100"
                >
                  Alle Beispiele anzeigen →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hochgeladene Seiten */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <Label className="text-base">Deine Impfpass-Fotos</Label>
              <p className="text-sm text-sage-600 mt-0.5">
                {totalCount > 0
                  ? `${totalCount} von max. ${MAX_IMPFASS_PHOTOS} Seiten hochgeladen`
                  : 'Noch keine Seiten hochgeladen'}
              </p>
            </div>
            {canAdd && totalCount > 0 && (
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={uploading}
                className="shrink-0 bg-sage-600 hover:bg-sage-700"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ImagePlus className="h-4 w-4 mr-2" />
                )}
                Weitere Seite
              </Button>
            )}
          </div>

        {!petId && (pendingPhotos.length > 0 || sessionPendingItems.length > 0) && (
          <p className="text-sm text-sage-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <strong>Hinweis:</strong> Die Fotos werden erst beim Speichern des Tieres endgültig
            verknüpft.
          </p>
        )}

        {totalCount === 0 && (
          <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Noch kein Impfpass hinterlegt</p>
            <p className="mt-1 text-amber-800">
              {isDocumentsVariant
                ? 'Lade die wichtigsten Seiten über die Beispiel-Karten hoch.'
                : 'Wähle oben „Am Computer hochladen“ oder scanne den QR-Code, um Fotos direkt vom Smartphone hochzuladen.'}
            </p>
          </div>
        )}

        {totalCount > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingPhotos.map((pending) => (
              <div
                key={pending.id}
                className="rounded-lg border border-dashed border-sage-300 bg-sage-50 overflow-hidden"
              >
                <div className="relative aspect-[4/3] bg-sage-100 flex items-center justify-center">
                  {pending.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pending.previewUrl}
                      alt={pending.file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileText className="h-10 w-10 text-sage-400" />
                  )}
                  <span className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
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
                <div className="p-3 space-y-1">
                  <p className="text-xs font-medium text-sage-800">
                    {IMPFPASS_CATEGORY_LABELS[pending.pageCategory]}
                  </p>
                  {pending.description && (
                    <p className="text-xs text-sage-600 line-clamp-2">{pending.description}</p>
                  )}
                </div>
              </div>
            ))}

            {sessionPendingItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-dashed border-blue-300 bg-blue-50/50 overflow-hidden"
              >
                <div className="relative aspect-[4/3] bg-sage-100 flex items-center justify-center">
                  {item.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.signedUrl}
                      alt={item.file_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileText className="h-10 w-10 text-sage-400" />
                  )}
                  <span className="absolute top-2 left-2 rounded bg-blue-600 px-2 py-0.5 text-[10px] text-white">
                    Vom Smartphone
                  </span>
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-xs font-medium text-sage-800">
                    {IMPFPASS_CATEGORY_LABELS[item.page_category ?? 'sonstiges']}
                  </p>
                  {item.description && (
                    <p className="text-xs text-sage-600 line-clamp-2">{item.description}</p>
                  )}
                  {!petId && (
                    <p className="text-[10px] text-blue-700">Wird beim Speichern verknüpft</p>
                  )}
                </div>
              </div>
            ))}

            {savedImpfpassDocs.map((doc) => (
              <div
                key={doc.id}
                className="rounded-lg border border-sage-200 bg-white overflow-hidden"
              >
                <div className="relative aspect-[4/3] bg-sage-100 flex items-center justify-center">
                  {previewUrls[doc.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrls[doc.id]}
                      alt={doc.file_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileText className="h-10 w-10 text-sage-400" />
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8"
                    disabled={deletingId === doc.id}
                    onClick={() => void handleDeleteSaved(doc.id)}
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs font-medium text-sage-800">
                    {IMPFPASS_CATEGORY_LABELS[doc.page_category ?? 'sonstiges']}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-sage-600 line-clamp-2">{doc.description}</p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => openEditDialog(doc)}
                  >
                    Beschreibung bearbeiten
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>

        <Dialog
          open={qrDialogOpen && !!mobileSessionId}
          onOpenChange={(open) => {
            if (!open) setQrDialogOpen(false)
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Impfpass vom Smartphone hochladen</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2">
              {mobileSessionId && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImpfpassUploadQrCodeUrl(
                      getImpfpassUploadMobileUrl(
                        typeof window !== 'undefined' ? window.location.origin : '',
                        mobileSessionId
                      )
                    )}
                    alt="QR-Code für Impfpass-Upload"
                    className="h-52 w-52 rounded-lg border border-sage-200 bg-white p-2"
                  />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-sage-900">
                      QR-Code mit der Handy-Kamera scannen
                    </p>
                    <p className="text-sm text-sage-600">
                      Fotos erscheinen automatisch in der Liste – auch wenn du dieses Fenster
                      schließt.
                    </p>
                    {isPollingMobile && (
                      <p className="text-xs text-sage-500 animate-pulse pt-1">
                        Warte auf Fotos vom Smartphone…
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setQrDialogOpen(false)}
              >
                Schließen
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sage-600"
                onClick={endMobileUploadSession}
              >
                Smartphone-Upload beenden
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Impfpass-Seite hinzufügen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!pendingFile && (
                <div>
                  <Label htmlFor="impfpass-upload-file">Datei</Label>
                  <Input
                    id="impfpass-upload-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*,application/pdf"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) setPendingFile(file)
                    }}
                  />
                </div>
              )}
              {pendingFile && (
                <p className="text-sm text-sage-600">Ausgewählt: {pendingFile.name}</p>
              )}
              <div>
                <Label>Kategorie</Label>
                <Select
                  value={uploadCategory}
                  onValueChange={(value) => setUploadCategory(value as ImpfpassPageCategory)}
                >
                  <SelectTrigger>
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
                <Label htmlFor="impfpass-upload-description">Zusätzliche Beschreibung (optional)</Label>
                <Textarea
                  id="impfpass-upload-description"
                  value={uploadDescription}
                  onChange={(event) => setUploadDescription(event.target.value)}
                  placeholder="z. B. aktuelle Tollwutimpfung"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button
                type="button"
                disabled={!pendingFile || uploading}
                onClick={() => void handleConfirmUpload()}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Hinzufügen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editDoc} onOpenChange={(open) => !open && setEditDoc(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Beschreibung bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Kategorie</Label>
                <Select
                  value={editCategory}
                  onValueChange={(value) => setEditCategory(value as ImpfpassPageCategory)}
                >
                  <SelectTrigger>
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
                <Label htmlFor="impfpass-edit-description">Zusätzliche Beschreibung (optional)</Label>
                <Textarea
                  id="impfpass-edit-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDoc(null)}>
                Abbrechen
              </Button>
              <Button type="button" disabled={savingEdit} onClick={() => void handleSaveEdit()}>
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
)
