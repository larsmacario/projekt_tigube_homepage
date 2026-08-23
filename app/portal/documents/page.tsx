'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import type { Document, Pet } from '@/lib/types'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { PetImpfpassGallery } from '@/components/portal/pet-impfpass-gallery'
import { getImpfpassCategoryLabel } from '@/lib/impfpass-photo-categories'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [impfpassPetId, setImpfpassPetId] = useState('')
  const [uploadForm, setUploadForm] = useState({
    document_type: '',
    pet_id: '',
    description: '',
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadDocuments()
    loadPets()
  }, [])

  async function loadDocuments() {
    try {
      const response = await authenticatedFetch('/api/portal/documents')
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadPets() {
    try {
      const response = await authenticatedFetch('/api/portal/pets')
      const data = await response.json()
      setPets(data.pets || [])
    } catch (error) {
      console.error('Error loading pets:', error)
    }
  }

  const requiresPet = uploadForm.document_type === 'wurmtest'

  async function handleUpload() {
    if (!uploadForm.document_type) {
      toast({
        title: 'Fehler',
        description: 'Bitte wähle einen Dokumententyp',
        variant: 'destructive',
      })
      return
    }

    const descriptionRequired =
      uploadForm.document_type !== 'impfpass' &&
      uploadForm.document_type !== 'vertrag' &&
      uploadForm.document_type !== 'wurmtest'

    if (descriptionRequired && !uploadForm.description.trim()) {
      toast({
        title: 'Fehler',
        description: 'Bitte gib eine Beschreibung ein',
        variant: 'destructive',
      })
      return
    }

    if (requiresPet && !uploadForm.pet_id) {
      toast({
        title: 'Fehler',
        description: 'Bitte wähle ein Tier für diesen Dokumententyp aus',
        variant: 'destructive',
      })
      return
    }

    const fileInput = fileInputRef.current
    if (!fileInput?.files?.[0]) {
      toast({
        title: 'Fehler',
        description: 'Bitte wähle eine Datei aus',
        variant: 'destructive',
      })
      return
    }

    const file = fileInput.files[0]
    const defaultDescription =
      uploadForm.document_type === 'vertrag'
        ? 'Betreuungsvertrag'
        : uploadForm.document_type === 'wurmtest'
        ? 'Wurmtest'
        : ''
    const description = uploadForm.description.trim() || defaultDescription

    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', uploadForm.document_type)
    if (description) {
      formData.append('description', description)
    }
    if (uploadForm.pet_id) {
      formData.append('pet_id', uploadForm.pet_id)
    }

    setUploading(true)
    try {
      const response = await authenticatedFetch('/api/portal/documents', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        loadDocuments()
        setUploadForm({ document_type: '', pet_id: '', description: '' })
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        toast({
          title: 'Erfolg',
          description: 'Dokument erfolgreich hochgeladen',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Hochladen',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Hochladen',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  function openDeleteDialog(document: Document) {
    setDocumentToDelete(document)
    setDeleteDialogOpen(true)
  }

  async function handleDelete() {
    if (!documentToDelete) return

    setIsDeleting(true)
    try {
      const response = await authenticatedFetch(`/api/portal/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadDocuments()
        setDeleteDialogOpen(false)
        setDocumentToDelete(null)
        toast({
          title: 'Erfolg',
          description: 'Dokument erfolgreich gelöscht',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Löschen',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Löschen',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleOpenDocument(documentId: string) {
    try {
      const response = await authenticatedFetch(`/api/portal/documents/${documentId}`)
      const data = await response.json()
      if (response.ok && data.signedUrl) {
        window.open(data.signedUrl, '_blank')
      } else {
        toast({
          title: 'Fehler',
          description: data.error || 'Dokument konnte nicht geöffnet werden',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error opening document:', error)
      toast({
        title: 'Fehler',
        description: 'Verbindungsfehler beim Öffnen des Dokuments',
        variant: 'destructive',
      })
    }
  }

  function getDocumentTypeLabel(type: string) {
    switch (type) {
      case 'vertrag':
        return 'Vertrag'
      case 'impfpass':
        return 'Impfpass'
      case 'wurmtest':
        return 'Wurmtest'
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">Dokumente</h1>
        <p className="mt-2 text-sage-600">Verwalte deine Dokumente</p>
      </div>

      {/* Impfpass – Schritt 1: Tier, Schritt 2: Seiten hochladen */}
      <Card>
        <CardHeader>
          <CardTitle>Impfpass hochladen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium text-sage-800 mb-2">1. Schritt: Tier wählen</p>
            <Label htmlFor="impfpass_pet_id" className="sr-only">
              Tier
            </Label>
            <Select value={impfpassPetId} onValueChange={setImpfpassPetId}>
              <SelectTrigger id="impfpass_pet_id">
                <SelectValue placeholder="Tier wählen" />
              </SelectTrigger>
              <SelectContent>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {impfpassPetId ? (
            <div>
              <p className="text-sm font-medium text-sage-800 mb-3">
                2. Schritt: Impfpass-Seiten hochladen
              </p>
              <PetImpfpassGallery
                variant="documents"
                petId={impfpassPetId}
                documents={documents}
                onDocumentsChange={setDocuments}
              />
            </div>
          ) : (
            <p className="text-sm text-sage-600 rounded-lg border border-dashed border-sage-300 bg-sage-50/50 px-4 py-3">
              Wähle zuerst ein Tier, um die Impfpass-Seiten hochzuladen.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Vertrag & Wurmtest */}
      <Card>
        <CardHeader>
          <CardTitle>Weitere Dokumente hochladen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="document_type">Dokumenttyp *</Label>
            <Select
              value={uploadForm.document_type}
              onValueChange={(value) => setUploadForm({ ...uploadForm, document_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Dokumenttyp wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vertrag">Vertrag</SelectItem>
                <SelectItem value="wurmtest">Wurmtest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requiresPet ? (
            <div>
              <Label htmlFor="pet_id">Tier *</Label>
              <Select
                value={uploadForm.pet_id}
                onValueChange={(value) =>
                  setUploadForm({ ...uploadForm, pet_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tier wählen" />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div>
            <Label htmlFor="description">Beschreibung *</Label>
            <Textarea
              id="description"
              value={uploadForm.description}
              onChange={(event) =>
                setUploadForm({ ...uploadForm, description: event.target.value })
              }
              placeholder="z. B. Wurmtest vom …"
              rows={2}
              maxLength={500}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="file">Datei *</Label>
            <input
              ref={fileInputRef}
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="mt-2 block w-full text-sm text-sage-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sage-600 file:text-white hover:file:bg-sage-700"
            />
          </div>

          <Button
            onClick={handleUpload}
            loading={uploading}
            className="bg-sage-600 hover:bg-sage-700"
          >
            {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
          </Button>
        </CardContent>
      </Card>

      {/* Dokumente-Liste */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sage-600">Noch keine Dokumente hochgeladen</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => handleOpenDocument(doc.id)}
                      className="font-semibold text-left text-sage-800 hover:text-sage-600 hover:underline focus:outline-none block truncate max-w-full"
                    >
                      {doc.file_name}
                    </button>
                    <p className="text-sm text-sage-600 mt-1">
                      {getDocumentTypeLabel(doc.document_type)}
                      {doc.document_type === 'impfpass' && doc.page_category && (
                        <> · {getImpfpassCategoryLabel(doc.page_category)}</>
                      )}
                    </p>
                    {doc.pet_id && (
                      <p className="text-sm text-sage-600">
                        Tier: {pets.find(p => p.id === doc.pet_id)?.name || 'Unbekannt'}
                      </p>
                    )}
                    {doc.description && (
                      <p className="text-sm text-sage-600 mt-1">{doc.description}</p>
                    )}
                    <p className="text-xs text-sage-500 mt-2">
                      Hochgeladen: {new Date(doc.uploaded_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(doc)}
                    className="shrink-0 self-end sm:self-auto text-red-600 hover:text-red-700"
                  >
                    Löschen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du "{documentToDelete?.file_name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
