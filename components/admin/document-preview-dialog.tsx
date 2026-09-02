'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react'
import {
  fetchAdminDocumentSignedUrl,
  isImageDocument,
  isPdfDocument,
} from '@/lib/admin-document-utils'
import type { Document } from '@/lib/types'
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/pet-form-options'
import { getImpfpassCategoryLabel } from '@/lib/impfpass-photo-categories'

interface DocumentPreviewDialogProps {
  documents: Document[]
  initialIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onDownload: (documentId: string) => void
}

function getDocumentTypeLabel(type: string) {
  return DOCUMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label || type
}

export function DocumentPreviewDialog({
  documents,
  initialIndex,
  open,
  onOpenChange,
  onDownload,
}: DocumentPreviewDialogProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const activeDoc = documents[activeIndex] ?? null
  const canGoPrev = activeIndex > 0
  const canGoNext = activeIndex < documents.length - 1

  const loadSignedUrl = useCallback(async (doc: Document) => {
    setLoading(true)
    setLoadError(null)
    setSignedUrl(null)

    const { signedUrl: url, error } = await fetchAdminDocumentSignedUrl(doc.id)

    if (error || !url) {
      setLoadError(error || 'Vorschau nicht verfügbar')
    } else {
      setSignedUrl(url)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) {
      setActiveIndex(initialIndex)
    }
  }, [open, initialIndex])

  useEffect(() => {
    if (!open || !activeDoc) {
      setSignedUrl(null)
      setLoadError(null)
      return
    }

    void loadSignedUrl(activeDoc)
  }, [open, activeDoc, loadSignedUrl])

  function goPrev() {
    setActiveIndex((i) => (i > 0 ? i - 1 : i))
  }

  function goNext() {
    setActiveIndex((i) => (i < documents.length - 1 ? i + 1 : i))
  }

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, documents.length])

  if (!activeDoc) return null

  const showImage = isImageDocument(activeDoc)
  const showPdf = isPdfDocument(activeDoc)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[95vh] max-h-[95vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-sage-200 px-4 py-3 pr-12">
          <DialogTitle className="truncate text-left">{activeDoc.file_name}</DialogTitle>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-sage-600">
            <span>{getDocumentTypeLabel(activeDoc.document_type)}</span>
            {activeDoc.document_type === 'impfpass' && activeDoc.page_category && (
              <span>{getImpfpassCategoryLabel(activeDoc.page_category)}</span>
            )}
            <span>{new Date(activeDoc.uploaded_at).toLocaleDateString('de-DE')}</span>
            <span className="text-sage-500">
              {activeIndex + 1} / {documents.length}
            </span>
          </div>
          {activeDoc.description && (
            <p className="text-left text-sm text-sage-500 line-clamp-2">{activeDoc.description}</p>
          )}
        </DialogHeader>

        <div className="relative min-h-0 flex-1 bg-sage-50">
          {canGoPrev && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 shadow-sm"
              onClick={goPrev}
              aria-label="Vorheriges Dokument"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {canGoNext && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 shadow-sm"
              onClick={goNext}
              aria-label="Nächstes Dokument"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}

          {loading && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sage-600">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Wird geladen…</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex h-full items-center justify-center px-8 text-center">
              <div>
                <p className="text-sm text-destructive">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => onDownload(activeDoc.id)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Herunterladen
                </Button>
              </div>
            </div>
          )}

          {!loading && !loadError && signedUrl && showImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrl}
              alt={activeDoc.file_name}
              className="h-full w-full object-contain"
            />
          )}

          {!loading && !loadError && signedUrl && showPdf && (
            <iframe
              src={signedUrl}
              title={activeDoc.file_name}
              className="h-full w-full border-0 bg-white"
            />
          )}

          {!loading && !loadError && signedUrl && !showImage && !showPdf && (
            <div className="flex h-full items-center justify-center px-8 text-center">
              <div>
                <p className="text-sm text-sage-600">Vorschau für diesen Dateityp nicht verfügbar.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => onDownload(activeDoc.id)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Herunterladen
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-sage-200 px-4 py-3 sm:justify-between">
          <p className="text-xs text-sage-500 hidden sm:block">
            ← → zum Blättern
          </p>
          <Button type="button" variant="outline" onClick={() => onDownload(activeDoc.id)}>
            <Download className="mr-2 h-4 w-4" />
            Herunterladen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
