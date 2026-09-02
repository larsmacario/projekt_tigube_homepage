'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, FileText, Pencil, Trash2, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { Document, Pet } from '@/lib/types'
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/pet-form-options'
import { getImpfpassCategoryLabel } from '@/lib/impfpass-photo-categories'
import { AdminSection } from '@/components/admin/admin-section'
import { DocumentPreviewDialog } from '@/components/admin/document-preview-dialog'
import { DocumentEditDialog } from '@/components/document-edit-dialog'
import {
  fetchAdminDocumentSignedUrl,
  isImageDocument,
  isPdfDocument,
} from '@/lib/admin-document-utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DocumentManagerProps {
  customerId: string
  documents: Document[]
  pets: Pet[]
  onDocumentsChange: (documents: Document[]) => void
  defaultExpanded?: boolean
  embedded?: boolean
}

function getDocumentTypeLabel(type: string) {
  return DOCUMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label || type
}

export function DocumentManager({
  customerId,
  documents,
  pets,
  onDocumentsChange,
  defaultExpanded = false,
  embedded = false,
}: DocumentManagerProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('general')
  const [uploadForm, setUploadForm] = useState({ document_type: '', pet_id: '', description: '' })
  const [selectedFileName, setSelectedFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [editDocument, setEditDocument] = useState<Document | null>(null)

  const showPetSelect =
    uploadForm.document_type === 'impfpass' || uploadForm.document_type === 'wurmtest'

  const generalDocuments = useMemo(
    () => documents.filter((doc) => !doc.pet_id),
    [documents]
  )

  const documentsByPetId = useMemo(() => {
    const map = new Map<string, Document[]>()
    for (const pet of pets) {
      map.set(pet.id, [])
    }
    for (const doc of documents) {
      if (doc.pet_id && map.has(doc.pet_id)) {
        map.get(doc.pet_id)!.push(doc)
      }
    }
    return map
  }, [documents, pets])

  const visibleDocuments = useMemo(() => {
    if (activeTab === 'general') {
      return generalDocuments
    }
    return documentsByPetId.get(activeTab) ?? []
  }, [activeTab, generalDocuments, documentsByPetId])

  useEffect(() => {
    let cancelled = false

    async function loadPreviews() {
      const entries = await Promise.all(
        documents.map(async (doc) => {
          if (!isImageDocument(doc)) {
            return [doc.id, ''] as const
          }
          const { signedUrl, error } = await fetchAdminDocumentSignedUrl(doc.id)
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
  }, [documents])

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    setUploadForm((prev) => {
      if (tab === 'general') {
        return { ...prev, pet_id: '' }
      }
      if (prev.document_type === 'impfpass' || prev.document_type === 'wurmtest') {
        return { ...prev, pet_id: tab }
      }
      return prev
    })
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !uploadForm.document_type) {
      toast({ title: 'Fehler', description: 'Datei und Dokumenttyp sind erforderlich', variant: 'destructive' })
      return
    }

    if (showPetSelect && !uploadForm.pet_id) {
      toast({ title: 'Fehler', description: 'Bitte wähle ein Tier aus', variant: 'destructive' })
      return
    }

    const descriptionRequired =
      uploadForm.document_type !== 'impfpass' &&
      uploadForm.document_type !== 'vertrag' &&
      uploadForm.document_type !== 'wurmtest'

    if (descriptionRequired && !uploadForm.description.trim()) {
      toast({ title: 'Fehler', description: 'Bitte gib eine Beschreibung ein', variant: 'destructive' })
      return
    }

    const defaultDescription =
      uploadForm.document_type === 'vertrag'
        ? 'Betreuungsvertrag'
        : uploadForm.document_type === 'wurmtest'
        ? 'Wurmtest'
        : ''
    const description = uploadForm.description.trim() || defaultDescription

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', uploadForm.document_type)
      formData.append('customer_id', customerId)
      if (description) formData.append('description', description)
      if (uploadForm.pet_id) formData.append('pet_id', uploadForm.pet_id)

      const response = await authenticatedFetch('/api/admin/documents', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        onDocumentsChange([data.document, ...documents])
        setUploadForm({ document_type: '', pet_id: '', description: '' })
        setSelectedFileName('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        toast({ title: 'Erfolg', description: 'Dokument hochgeladen' })
      } else {
        const error = await response.json()
        toast({ title: 'Fehler', description: error.error || 'Fehler beim Hochladen', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Fehler beim Hochladen', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(documentId: string) {
    try {
      const response = await authenticatedFetch(`/api/admin/documents/${documentId}`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        window.open(data.signedUrl, '_blank')
      } else {
        const error = await response.json()
        toast({ title: 'Fehler', description: error.error || 'Download fehlgeschlagen', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Download fehlgeschlagen', variant: 'destructive' })
    }
  }

  async function confirmDelete() {
    if (!deleteId) return

    try {
      const response = await authenticatedFetch(`/api/admin/documents/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        const deletedId = deleteId
        const nextDocuments = documents.filter((d) => d.id !== deletedId)
        onDocumentsChange(nextDocuments)
        setDeleteId(null)
        setPreviewUrls((current) => {
          const next = { ...current }
          delete next[deletedId]
          return next
        })
        if (previewIndex !== null) {
          const deletedIndex = visibleDocuments.findIndex((d) => d.id === deletedId)
          if (deletedIndex === previewIndex) {
            const nextVisible = visibleDocuments.filter((d) => d.id !== deletedId)
            if (nextVisible.length === 0) {
              setPreviewIndex(null)
            } else {
              setPreviewIndex(Math.min(previewIndex, nextVisible.length - 1))
            }
          } else if (deletedIndex >= 0 && deletedIndex < previewIndex) {
            setPreviewIndex(previewIndex - 1)
          }
        }
        toast({ title: 'Erfolg', description: 'Dokument gelöscht' })
      } else {
        const error = await response.json()
        toast({ title: 'Fehler', description: error.error || 'Fehler beim Löschen', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Fehler beim Löschen', variant: 'destructive' })
    }
  }

  function renderDocumentList(docs: Document[], emptyMessage: string) {
    if (docs.length === 0) {
      return <p className="py-6 text-center text-sm text-sage-600">{emptyMessage}</p>
    }

    return (
      <div className="space-y-2">
        {docs.map((doc, index) => (
          <div
            key={doc.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-sage-200 bg-white p-3"
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
              onClick={() => setPreviewIndex(index)}
            >
              <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-sage-200 bg-sage-100">
                {previewUrls[doc.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrls[doc.id]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : isPdfDocument(doc) ? (
                  <FileText className="h-5 w-5 text-sage-600" aria-hidden />
                ) : (
                  <FileText className="h-5 w-5 text-sage-400" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-sage-900">{doc.file_name}</p>
                <p className="text-sm text-sage-600">{getDocumentTypeLabel(doc.document_type)}</p>
                {doc.document_type === 'impfpass' && doc.page_category && (
                  <p className="text-xs text-sage-600">
                    {getImpfpassCategoryLabel(doc.page_category)}
                  </p>
                )}
                {doc.description && (
                  <p className="text-xs text-sage-500 line-clamp-2">{doc.description}</p>
                )}
                <p className="text-xs text-sage-500">
                  {new Date(doc.uploaded_at).toLocaleDateString('de-DE')}
                </p>
              </div>
            </button>
            <div className="flex shrink-0 gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setEditDocument(doc)}
                aria-label="Dokument bearbeiten"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleDownload(doc.id)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteId(doc.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <AdminSection
        title={`Dokumente (${documents.length})`}
        embedded={embedded}
        defaultExpanded={defaultExpanded}
      >
        <div className="space-y-5">
        <div className="rounded-lg border border-sage-200 bg-sage-50/60 p-4 space-y-4">
          <p className="text-sm font-semibold text-sage-900">Dokument hochladen</p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-doc-type">Dokumenttyp</Label>
                <Select
                  value={uploadForm.document_type}
                  onValueChange={(v) =>
                    setUploadForm({
                      document_type: v,
                      pet_id: v === 'vertrag' ? '' : uploadForm.pet_id,
                      description: uploadForm.description,
                    })
                  }
                >
                  <SelectTrigger id="admin-doc-type" className="w-full bg-white">
                    <SelectValue placeholder="Typ wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showPetSelect && (
                <div className="space-y-2">
                  <Label htmlFor="admin-doc-pet">Tier *</Label>
                  <Select
                    value={uploadForm.pet_id}
                    onValueChange={(v) => setUploadForm({ ...uploadForm, pet_id: v })}
                  >
                    <SelectTrigger id="admin-doc-pet" className="w-full bg-white">
                      <SelectValue placeholder="Tier wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-doc-description">Beschreibung *</Label>
              <Textarea
                id="admin-doc-description"
                value={uploadForm.description}
                onChange={(event) =>
                  setUploadForm({ ...uploadForm, description: event.target.value })
                }
                placeholder="z. B. aktuelle Tollwutimpfung, Wurmtest vom …"
                rows={2}
                maxLength={500}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-doc-file">Datei</Label>
              <input
                ref={fileInputRef}
                id="admin-doc-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name || '')}
                className="block w-full text-sm text-sage-600 file:mr-4 file:rounded-md file:border-0 file:bg-sage-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-sage-700"
              />
              {selectedFileName && (
                <p className="text-xs text-sage-500 truncate">Ausgewählt: {selectedFileName}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadForm.document_type}
              className="bg-sage-600 hover:bg-sage-700 min-w-[140px]"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Wird hochgeladen…' : 'Hochladen'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-sage-100/60 p-1 rounded-lg border border-sage-200 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="general" className="rounded-md px-3 py-1.5 text-sm">
              Allgemein ({generalDocuments.length})
            </TabsTrigger>
            {pets.map((pet) => (
              <TabsTrigger key={pet.id} value={pet.id} className="rounded-md px-3 py-1.5 text-sm">
                {pet.name} ({documentsByPetId.get(pet.id)?.length ?? 0})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="general" className="mt-4">
            {renderDocumentList(generalDocuments, 'Keine allgemeinen Dokumente hochgeladen')}
          </TabsContent>

          {pets.map((pet) => (
            <TabsContent key={pet.id} value={pet.id} className="mt-4">
              {renderDocumentList(
                documentsByPetId.get(pet.id) ?? [],
                'Keine Dokumente für dieses Tier'
              )}
            </TabsContent>
          ))}
        </Tabs>
        </div>
      </AdminSection>

      <DocumentPreviewDialog
        documents={visibleDocuments}
        initialIndex={previewIndex ?? 0}
        open={previewIndex !== null}
        onOpenChange={(open) => !open && setPreviewIndex(null)}
        onDownload={handleDownload}
      />

      <DocumentEditDialog
        document={editDocument}
        pets={pets}
        open={editDocument !== null}
        onOpenChange={(open) => !open && setEditDocument(null)}
        mode="admin"
        onSaved={(updated) => {
          onDocumentsChange(documents.map((doc) => (doc.id === updated.id ? updated : doc)))
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
            <AlertDialogDescription>Das Dokument wird dauerhaft entfernt.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
