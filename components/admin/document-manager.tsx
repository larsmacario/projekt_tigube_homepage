'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { Document, Pet } from '@/lib/types'
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/pet-form-options'
import { CollapsibleAdminCard } from '@/components/admin/collapsible-admin-card'
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
}: DocumentManagerProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadForm, setUploadForm] = useState({ document_type: '', pet_id: '' })
  const [selectedFileName, setSelectedFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const showPetSelect =
    uploadForm.document_type === 'impfpass' || uploadForm.document_type === 'wurmtest'

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !uploadForm.document_type) {
      toast({ title: 'Fehler', description: 'Datei und Dokumenttyp sind erforderlich', variant: 'destructive' })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', uploadForm.document_type)
      formData.append('customer_id', customerId)
      if (uploadForm.pet_id) formData.append('pet_id', uploadForm.pet_id)

      const response = await authenticatedFetch('/api/admin/documents', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        onDocumentsChange([data.document, ...documents])
        setUploadForm({ document_type: '', pet_id: '' })
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
        onDocumentsChange(documents.filter((d) => d.id !== deleteId))
        setDeleteId(null)
        toast({ title: 'Erfolg', description: 'Dokument gelöscht' })
      } else {
        const error = await response.json()
        toast({ title: 'Fehler', description: error.error || 'Fehler beim Löschen', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Fehler beim Löschen', variant: 'destructive' })
    }
  }

  return (
    <>
      <CollapsibleAdminCard
        title={`Dokumente (${documents.length})`}
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
                    setUploadForm({ document_type: v, pet_id: v === 'vertrag' ? '' : uploadForm.pet_id })
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
                  <Label htmlFor="admin-doc-pet">Tier (optional)</Label>
                  <Select
                    value={uploadForm.pet_id || 'none'}
                    onValueChange={(v) => setUploadForm({ ...uploadForm, pet_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger id="admin-doc-pet" className="w-full bg-white">
                      <SelectValue placeholder="Kein Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Tier</SelectItem>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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

        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-sage-200 bg-white p-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-sage-100 p-2 text-sage-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sage-900">{doc.file_name}</p>
                    <p className="text-sm text-sage-600">{getDocumentTypeLabel(doc.document_type)}</p>
                    <p className="text-xs text-sage-500">
                      {new Date(doc.uploaded_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(doc.id)}>
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
        ) : (
          <p className="py-6 text-center text-sm text-sage-600">Keine Dokumente hochgeladen</p>
        )}
        </div>
      </CollapsibleAdminCard>

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
