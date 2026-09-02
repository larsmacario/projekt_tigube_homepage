'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2 } from 'lucide-react'
import type { Pet, Document } from '@/lib/types'
import { PetAvatar } from '@/components/pet-avatar'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import {
  PetVaccinationSection,
  PetVaccinationSummary,
} from '@/components/portal/pet-vaccination-section'
import {
  formatPetSaveWarning,
  getPetSaveWarnings,
  isDog,
  validatePetSaveRequired,
} from '@/lib/pet-vaccination'
import { getPetsWithDashboardMissingFields } from '@/lib/pet-vaccination'
import { PetPhotoGallery, type PetPhotoGalleryHandle } from '@/components/portal/pet-photo-gallery'
import type { PetImpfpassGalleryHandle } from '@/components/portal/pet-impfpass-gallery'
import { PetRecognitionField } from '@/components/portal/pet-recognition-field'
import { PetDewormingDateField } from '@/components/portal/pet-deworming-date-field'
import { PetDeceasedField } from '@/components/portal/pet-deceased-field'
import { PetMissingFieldsHint } from '@/components/portal/pet-missing-fields-hint'
import { PetCarePlanForm } from '@/components/portal/pet-care-plan-form'
import { PetCarePlanLegacyBanner } from '@/components/portal/pet-care-plan-legacy-banner'
import { PetCarePlanSummary } from '@/components/portal/pet-care-plan-summary'
import { buildPetSaveBody, carePlanFromPet } from '@/lib/pet-care-plan-form-state'
import type { PetCarePlan } from '@/lib/pet-care-plan'
import { readApiResponse } from '@/lib/read-api-response'
import { uploadPortalDocuments } from '@/lib/portal-document-upload'
import { formatDeceasedLabel, isPetDeceased } from '@/lib/pet-lifecycle'
import {
  PET_GESCHLECHT_OPTIONS,
  formatPetGeschlecht,
  normalizePetGeschlecht,
} from '@/lib/pet-form-options'

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showPetForm, setShowPetForm] = useState(false)
  const [editingPetId, setEditingPetId] = useState<string | null>(null)
  const [uploadingDocuments, setUploadingDocuments] = useState(false)
  const [wurmtestFiles, setWurmtestFiles] = useState<File[]>([])
  const [petFormData, setPetFormData] = useState({
    name: '',
    tierart: '',
    rasse: '',
    farbe: '',
    wiedererkennungsmerkmal: '',
    geschlecht: '',
    letzte_impfung: '',
    letzte_impfung_zusatz: '',
    futtermenge: '',
    medikamente: '',
    besonderheiten: '',
    intervall_impfung: '',
    intervall_entwurmung: '',
    letzte_stuhlprobe: '',
    naechste_stuhlprobe: '',
    deceased_at: '',
  })
  const [carePlan, setCarePlan] = useState<PetCarePlan>(() => carePlanFromPet())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formPhotoCount, setFormPhotoCount] = useState(0)
  const [formImpfpassCount, setFormImpfpassCount] = useState(0)
  const petPhotoGalleryRef = useRef<PetPhotoGalleryHandle>(null)
  const petImpfpassGalleryRef = useRef<PetImpfpassGalleryHandle>(null)
  const [photoGalleryKey, setPhotoGalleryKey] = useState('new-pet')
  const { toast } = useToast()

  useEffect(() => {
    loadPets()
  }, [])

  async function loadPets() {
    try {
      const response = await authenticatedFetch('/api/portal/pets')
      const { data, error } = await readApiResponse<{ pets?: Pet[] }>(response)
      if (error) {
        console.error('Error loading pets:', error)
        return
      }
      setPets(data?.pets || [])

      const docsResponse = await authenticatedFetch('/api/portal/documents')
      if (docsResponse.ok) {
        const docsResult = await readApiResponse<{ documents?: Document[] }>(docsResponse)
        if (!docsResult.error) {
          setDocuments(docsResult.data?.documents || [])
        }
      }
    } catch (error) {
      console.error('Error loading pets:', error)
    } finally {
      setLoading(false)
    }
  }

  function openPetForm(pet?: Pet) {
    if (pet) {
      setEditingPetId(pet.id)
      setPetFormData({
        name: pet.name,
        tierart: pet.tierart || '',
        rasse: pet.rasse || '',
        farbe: pet.farbe || '',
        wiedererkennungsmerkmal: pet.wiedererkennungsmerkmal || '',
        geschlecht: pet.geschlecht || '',
        letzte_impfung: pet.letzte_impfung ? pet.letzte_impfung.split('T')[0] : '',
        letzte_impfung_zusatz: pet.letzte_impfung_zusatz ? pet.letzte_impfung_zusatz.split('T')[0] : '',
        futtermenge: pet.futtermenge || '',
        medikamente: pet.medikamente || '',
        besonderheiten: pet.besonderheiten || '',
        intervall_impfung: pet.intervall_impfung || '',
        intervall_entwurmung: pet.intervall_entwurmung || '',
        letzte_stuhlprobe: pet.letzte_stuhlprobe || '',
        naechste_stuhlprobe: pet.naechste_stuhlprobe
          ? pet.naechste_stuhlprobe.split('T')[0]
          : '',
        deceased_at: pet.deceased_at ? pet.deceased_at.split('T')[0] : '',
      })
      setCarePlan(carePlanFromPet(pet))
    } else {
      setEditingPetId(null)
      setPetFormData({
        name: '',
        tierart: '',
        rasse: '',
        farbe: '',
        wiedererkennungsmerkmal: '',
        geschlecht: '',
        letzte_impfung: '',
        letzte_impfung_zusatz: '',
        futtermenge: '',
        medikamente: '',
        besonderheiten: '',
        intervall_impfung: '',
        intervall_entwurmung: '',
        letzte_stuhlprobe: '',
        naechste_stuhlprobe: '',
        deceased_at: '',
      })
      setCarePlan(carePlanFromPet())
    }
    setWurmtestFiles([])
    setFormPhotoCount(pet?.photo_count ?? 0)
    setFormImpfpassCount(0)
    setPhotoGalleryKey(pet?.id ?? crypto.randomUUID())
    setShowPetForm(true)
  }

  async function handleSavePet() {
    const saveError = validatePetSaveRequired(petFormData)
    if (saveError) {
      toast({
        title: 'Fehler',
        description: saveError,
        variant: 'destructive',
      })
      return
    }

    const saveWarning = formatPetSaveWarning(
      getPetSaveWarnings({
        formData: petFormData,
        documents,
        editingPetId,
        impfpassCount: formImpfpassCount,
        wurmtestFiles,
        photoCount: formPhotoCount,
      })
    )
    if (saveWarning) {
      toast({
        title: 'Hinweis',
        description: saveWarning,
      })
    }

    try {
      setUploadingDocuments(true)
      const wasEditing = !!editingPetId
      
      const url = editingPetId 
        ? `/api/portal/pets/${editingPetId}`
        : '/api/portal/pets'
      const method = editingPetId ? 'PUT' : 'POST'
      
      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPetSaveBody(petFormData, carePlan)),
      })

      const { data: petData, error: saveApiError } = await readApiResponse<{
        pet?: Pet
        error?: string
      }>(response)

      if (saveApiError || !petData?.pet) {
        toast({
          title: 'Fehler',
          description: saveApiError || 'Fehler beim Speichern',
          variant: 'destructive',
        })
        setUploadingDocuments(false)
        return
      }

      const savedPetId = petData.pet.id || editingPetId
      let photoCount = formPhotoCount

      // Lade Dokumente hoch, falls vorhanden
      if (savedPetId) {
        const uploadPromises: Promise<void>[] = []

        if (wurmtestFiles.length > 0) {
          uploadPromises.push(
            uploadPortalDocuments({
              files: wurmtestFiles,
              documentType: 'wurmtest',
              petId: savedPetId,
              description: 'Wurmtest-Befund',
            }).then(({ documents: uploaded, errors }) => {
              if (errors.length > 0) {
                toast({
                  title: 'Warnung',
                  description:
                    errors.length === wurmtestFiles.length
                      ? errors[0]
                      : `${uploaded.length} von ${wurmtestFiles.length} Wurmtest-Dateien hochgeladen.`,
                  variant: 'destructive',
                })
              }
            })
          )
        }

        await Promise.all(uploadPromises)

        if (petImpfpassGalleryRef.current) {
          try {
            await petImpfpassGalleryRef.current.flushPendingUploads(savedPetId)
          } catch {
            // Fehlertoast kommt aus der Galerie
          }
        }

        if (petPhotoGalleryRef.current) {
          try {
            photoCount = await petPhotoGalleryRef.current.flushPendingUploads(savedPetId)
            setFormPhotoCount(photoCount)
          } catch {
            // Fehlertoast kommt aus der Galerie
          }
        }

        if (!editingPetId) {
          setEditingPetId(savedPetId)
        }
      }

      await loadPets()

      const missingPhoto = photoCount === 0

      setPetFormData({
        name: '',
        tierart: '',
        rasse: '',
        farbe: '',
        wiedererkennungsmerkmal: '',
        geschlecht: '',
        letzte_impfung: '',
        letzte_impfung_zusatz: '',
        futtermenge: '',
        medikamente: '',
        besonderheiten: '',
        intervall_impfung: '',
        intervall_entwurmung: '',
        letzte_stuhlprobe: '',
        naechste_stuhlprobe: '',
        deceased_at: '',
      })
      setWurmtestFiles([])
      setShowPetForm(false)
      setEditingPetId(null)
      setFormPhotoCount(0)
      setFormImpfpassCount(0)

      toast({
        title: 'Erfolg',
        description: wasEditing ? 'Tier erfolgreich aktualisiert' : 'Tier erfolgreich hinzugefügt',
      })

      if (missingPhoto) {
        toast({
          title: 'Hinweis',
          description:
            'Bitte ergänze später noch ein Tierfoto – das hilft uns bei der Wiedererkennung.',
        })
      }
    } catch (error) {
      console.error('Error saving pet:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setUploadingDocuments(false)
    }
  }

  function openDeleteDialog(pet: Pet) {
    setPetToDelete(pet)
    setDeleteDialogOpen(true)
  }

  async function handleDelete() {
    if (!petToDelete) return

    setIsDeleting(true)
    try {
      const response = await authenticatedFetch(`/api/portal/pets/${petToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadPets()
        setDeleteDialogOpen(false)
        setPetToDelete(null)
        toast({
          title: 'Erfolg',
          description: 'Tier erfolgreich gelöscht',
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
      console.error('Error deleting pet:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Löschen',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  const hasExistingWurmtest = editingPetId && documents.some(d => d.pet_id === editingPetId && d.document_type === 'wurmtest')
  const petsWithMissingFields = getPetsWithDashboardMissingFields(pets, documents)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">Meine Tiere</h1>
        <p className="mt-2 text-sage-600">Verwalte deine Tiere</p>
      </div>

      {petsWithMissingFields.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Fehlende Angaben</CardTitle>
            <CardDescription className="text-amber-700">
              Bitte ergänze die fehlenden Angaben für deine Tiere.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {petsWithMissingFields.map(({ pet, missingFields }) => (
                <li key={pet.id} className="text-sm text-amber-800">
                  <span className="font-semibold">{pet.name}:</span>{' '}
                  {missingFields.join(', ')}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tier/e anlegen */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Deine Tier/e</CardTitle>
              <CardDescription className="mt-1">
                Lege deine Tier/e an und ergänze die Tierinformationen. Für jedes Tier kannst du spezifische Informationen wie Futtermenge, Medikamente und Besonderheiten hinterlegen.
              </CardDescription>
            </div>
            <Button
              onClick={() => openPetForm()}
              className="bg-sage-600 hover:bg-sage-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tier hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showPetForm && (
            <div className="p-4 border border-sage-200 rounded-lg bg-sage-50 space-y-4">
              <p className="text-sm text-sage-600">
                Speichere zuerst Name und Tierart – Impfpass, Wurmtest und weitere Angaben kannst du
                danach jederzeit ergänzen.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pet-name">Name *</Label>
                  <Input
                    id="pet-name"
                    value={petFormData.name}
                    onChange={(e) => setPetFormData({ ...petFormData, name: e.target.value })}
                    placeholder="Name des Tieres"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pet-tierart">Tierart *</Label>
                  <Select
                    value={petFormData.tierart || ''}
                    onValueChange={(value) => setPetFormData({ ...petFormData, tierart: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tierart wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hund">Hund</SelectItem>
                      <SelectItem value="Katze">Katze</SelectItem>
                      <SelectItem value="Andere">Andere</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="pet-geschlecht">Geschlecht</Label>
                  <Select
                    value={normalizePetGeschlecht(petFormData.geschlecht)}
                    onValueChange={(value) => setPetFormData({ ...petFormData, geschlecht: value })}
                  >
                    <SelectTrigger id="pet-geschlecht">
                      <SelectValue placeholder="Geschlecht wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {PET_GESCHLECHT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pet-rasse">Rasse</Label>
                  <Input
                    id="pet-rasse"
                    value={petFormData.rasse || ''}
                    onChange={(e) => setPetFormData({ ...petFormData, rasse: e.target.value })}
                    placeholder="z.B. Labrador, Mischling"
                  />
                </div>
                <div>
                  <Label htmlFor="pet-farbe">Farbe</Label>
                  <Input
                    id="pet-farbe"
                    value={petFormData.farbe || ''}
                    onChange={(e) => setPetFormData({ ...petFormData, farbe: e.target.value })}
                    placeholder="z.B. schwarz, braun-weiß"
                  />
                </div>
              </div>

              <PetRecognitionField
                value={petFormData.wiedererkennungsmerkmal || ''}
                onChange={(value) => setPetFormData({ ...petFormData, wiedererkennungsmerkmal: value })}
              />

              <PetPhotoGallery
                ref={petPhotoGalleryRef}
                key={photoGalleryKey}
                petId={editingPetId}
                onPhotoCountChange={(count) => {
                  setFormPhotoCount(count)
                  if (count > 0) void loadPets()
                }}
              />

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-sage-900">Futter- & Medikamentenplan</h3>
                <PetCarePlanLegacyBanner pet={{ ...petFormData, care_plan: carePlan }} />
                <PetCarePlanForm
                  value={carePlan}
                  onChange={setCarePlan}
                  idPrefix="pets-page"
                />
                {!isDog(petFormData.tierart) && (
                  <div>
                    <h4 className="font-semibold mb-3">Intervalle</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pet-intervall-impfung">Intervall Impfung</Label>
                        <Select
                          value={petFormData.intervall_impfung || ''}
                          onValueChange={(value) => setPetFormData({ ...petFormData, intervall_impfung: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Intervall wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monatlich">Monatlich</SelectItem>
                            <SelectItem value="vierteljährlich">Vierteljährlich</SelectItem>
                            <SelectItem value="halbjährlich">Halbjährlich</SelectItem>
                            <SelectItem value="jährlich">Jährlich</SelectItem>
                            <SelectItem value="alle_2_jahre">Alle 2 Jahre</SelectItem>
                            <SelectItem value="alle_3_jahre">Alle 3 Jahre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dokumente & Vorsorge */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-sage-900">Dokumente & Vorsorge</h3>
                
                <PetVaccinationSection
                  key={photoGalleryKey}
                  values={petFormData}
                  onChange={(updates) => setPetFormData({ ...petFormData, ...updates })}
                  idPrefix="pet"
                  petId={editingPetId}
                  documents={documents}
                  onDocumentsChange={setDocuments}
                  impfpassGalleryRef={petImpfpassGalleryRef}
                  onImpfpassCountChange={setFormImpfpassCount}
                />

                {/* Wurmtest Bereich */}
                <div className="p-4 bg-sage-50/50 rounded-lg border border-sage-100 space-y-4">
                  <h4 className="font-semibold text-sm text-sage-800 border-b pb-1">Wurmtest & Entwurmung</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                      <Label htmlFor="pet-wurmtest">
                        Wurmtest (Foto aufnehmen, Bild oder PDF)
                        {hasExistingWurmtest ? ' (bereits hochgeladen)' : ''}
                      </Label>
                      <Input
                        id="pet-wurmtest"
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        className="h-9 text-sm"
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? [])
                          if (files.length > 0) {
                            setWurmtestFiles((current) => [...current, ...files])
                          }
                          e.target.value = ''
                        }}
                      />
                      {wurmtestFiles.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {wurmtestFiles.map((file, index) => (
                            <li
                              key={`${file.name}-${file.size}-${index}`}
                              className="flex items-center justify-between gap-2 text-sm text-sage-600"
                            >
                              <span className="truncate">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 shrink-0 px-2 text-sage-600"
                                onClick={() =>
                                  setWurmtestFiles((current) =>
                                    current.filter((_, i) => i !== index)
                                  )
                                }
                              >
                                Entfernen
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <PetDewormingDateField
                      key={photoGalleryKey}
                      idPrefix="pet"
                      letzteStuhlprobe={petFormData.letzte_stuhlprobe || ''}
                      naechsteStuhlprobe={petFormData.naechste_stuhlprobe || ''}
                      onChange={(values) =>
                        setPetFormData({
                          ...petFormData,
                          letzte_stuhlprobe: values.letzte_stuhlprobe,
                          naechste_stuhlprobe: values.naechste_stuhlprobe,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {editingPetId && (
                <PetDeceasedField
                  idPrefix="pets-page"
                  deceasedAt={petFormData.deceased_at || null}
                  onChange={(deceasedAt) =>
                    setPetFormData({ ...petFormData, deceased_at: deceasedAt || '' })
                  }
                />
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSavePet}
                  disabled={!petFormData.name || !petFormData.tierart}
                  loading={uploadingDocuments}
                  className="bg-sage-600 hover:bg-sage-700"
                >
                  {uploadingDocuments 
                    ? 'Wird gespeichert...' 
                    : editingPetId 
                    ? 'Tier aktualisieren' 
                    : 'Tier speichern'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPetForm(false)
                    setEditingPetId(null)
                    setPetFormData({
                      name: '',
                      tierart: '',
                      rasse: '',
                      farbe: '',
                      wiedererkennungsmerkmal: '',
                      geschlecht: '',
                      letzte_impfung: '',
                      letzte_impfung_zusatz: '',
                      futtermenge: '',
                      medikamente: '',
                      besonderheiten: '',
                      intervall_impfung: '',
                      intervall_entwurmung: '',
                      letzte_stuhlprobe: '',
                      naechste_stuhlprobe: '',
                      deceased_at: '',
                    })
                    setWurmtestFiles([])
                    setFormPhotoCount(0)
                    setFormImpfpassCount(0)
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {pets.length === 0 ? (
            <p className="text-sage-600 text-center py-8">
              Noch keine Tier/e angelegt. Bitte füge mindestens ein Tier hinzu.
            </p>
          ) : (
            <div className="space-y-4">
              {pets.map((pet) => (
                <div key={pet.id} className="p-4 border border-sage-200 rounded-lg">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <PetAvatar name={pet.name} photoUrl={pet.primary_photo_url} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p className="font-semibold text-lg">{pet.name}</p>
                          {isPetDeceased(pet) && pet.deceased_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatDeceasedLabel(pet.deceased_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-sage-600">
                          {[pet.tierart, pet.rasse, pet.farbe, formatPetGeschlecht(pet.geschlecht)].filter(Boolean).join(' • ')}
                        </p>
                        <PetMissingFieldsHint
                          pet={pet}
                          documents={documents}
                          className="mt-2 text-sm text-amber-700"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPetForm(pet)}
                        className="border-sage-300 text-sage-700 hover:bg-sage-50"
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(pet)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {(pet.care_plan || pet.futtermenge || pet.medikamente || pet.besonderheiten || pet.intervall_impfung || pet.letzte_stuhlprobe || pet.naechste_stuhlprobe) && (
                    <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                      {pet.care_plan && (
                        <PetCarePlanSummary pet={pet} compact />
                      )}
                      {pet.letzte_stuhlprobe && (
                        <div>
                          <p className="text-xs font-semibold text-sage-600">Letzte Entwurmung/Stuhlprobe:</p>
                          <p className="text-sm text-sage-700">
                            {new Date(pet.letzte_stuhlprobe).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      )}
                      {pet.naechste_stuhlprobe && (
                        <div>
                          <p className="text-xs font-semibold text-sage-600">Nächste Entwurmung/Stuhlprobe:</p>
                          <p className="text-sm text-sage-700">
                            {new Date(pet.naechste_stuhlprobe).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      )}
                      {pet.futtermenge && (
                        <div>
                          <p className="text-xs font-semibold text-sage-600">Futtermenge:</p>
                          <p className="text-sm text-sage-700">{pet.futtermenge}</p>
                        </div>
                      )}
                      {pet.medikamente && (
                        <div>
                          <p className="text-xs font-semibold text-sage-600">Medikamente:</p>
                          <p className="text-sm text-sage-700">{pet.medikamente}</p>
                        </div>
                      )}
                      {pet.besonderheiten && (
                        <div>
                          <p className="text-xs font-semibold text-sage-600">Besonderheiten:</p>
                          <p className="text-sm text-sage-700">{pet.besonderheiten}</p>
                        </div>
                      )}
                          <PetVaccinationSummary pet={pet} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tier löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du "{petToDelete?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
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
