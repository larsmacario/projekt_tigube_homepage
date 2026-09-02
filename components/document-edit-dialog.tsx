'use client'

import { useEffect, useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { CustomerDocumentType } from '@/lib/customer-documents'
import { updateAdminDocumentMetadata } from '@/lib/admin-document-utils'
import {
  IMPFPASS_CATEGORY_LABELS,
  IMPFPASS_PAGE_CATEGORIES,
  type ImpfpassPageCategory,
} from '@/lib/impfpass-photo-categories'
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/pet-form-options'
import { updatePortalDocumentMetadata } from '@/lib/portal-document-upload'
import type { Document, Pet } from '@/lib/types'

type DocumentEditDialogProps = {
  document: Document | null
  pets: Pet[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (document: Document) => void
  mode: 'admin' | 'portal'
}

export function DocumentEditDialog({
  document,
  pets,
  open,
  onOpenChange,
  onSaved,
  mode,
}: DocumentEditDialogProps) {
  const { toast } = useToast()
  const [documentType, setDocumentType] = useState<CustomerDocumentType>('vertrag')
  const [petId, setPetId] = useState('')
  const [pageCategory, setPageCategory] = useState<ImpfpassPageCategory>('sonstiges')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const requiresPet = documentType === 'impfpass' || documentType === 'wurmtest'
  const showPageCategory = documentType === 'impfpass'

  useEffect(() => {
    if (!document || !open) return
    setDocumentType(document.document_type)
    setPetId(document.pet_id ?? '')
    setPageCategory(document.page_category ?? 'sonstiges')
    setDescription(document.description ?? '')
  }, [document, open])

  async function handleSave() {
    if (!document) return

    if (requiresPet && !petId) {
      toast({
        title: 'Fehler',
        description: 'Bitte wähle ein Tier aus.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const input = {
        documentId: document.id,
        documentType,
        petId: requiresPet ? petId : null,
        pageCategory: showPageCategory ? pageCategory : undefined,
        description,
      }

      const { document: updated, error } =
        mode === 'admin'
          ? await updateAdminDocumentMetadata(input)
          : await updatePortalDocumentMetadata(input)

      if (error || !updated) {
        throw new Error(error || 'Speichern fehlgeschlagen')
      }

      onSaved(updated)
      onOpenChange(false)
      toast({ title: 'Dokument aktualisiert' })
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dokument bearbeiten</DialogTitle>
        </DialogHeader>
        {document && (
          <div className="space-y-4">
            <p className="text-sm text-sage-600 truncate">{document.file_name}</p>

            <div className="space-y-2">
              <Label htmlFor="document-edit-type">Dokumenttyp</Label>
              <Select
                value={documentType}
                onValueChange={(value) => setDocumentType(value as CustomerDocumentType)}
              >
                <SelectTrigger id="document-edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresPet && (
              <div className="space-y-2">
                <Label htmlFor="document-edit-pet">Tier *</Label>
                <Select value={petId} onValueChange={setPetId}>
                  <SelectTrigger id="document-edit-pet">
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
            )}

            {showPageCategory && (
              <div className="space-y-2">
                <Label htmlFor="document-edit-category">Impfpass-Kategorie</Label>
                <Select
                  value={pageCategory}
                  onValueChange={(value) => setPageCategory(value as ImpfpassPageCategory)}
                >
                  <SelectTrigger id="document-edit-category">
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
            )}

            <div className="space-y-2">
              <Label htmlFor="document-edit-description">Bezeichnung / Beschreibung</Label>
              <Textarea
                id="document-edit-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="z. B. Wurmtest vom …, aktuelle Tollwutimpfung"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button type="button" disabled={saving || !document} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
