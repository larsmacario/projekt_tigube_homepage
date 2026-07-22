'use client'

import { useEffect, useState } from 'react'
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
import { getPetsWithoutPhotos } from '@/lib/pet-photos'
import { PetPhotoGallery } from '@/components/portal/pet-photo-gallery'
import { PetRecognitionField } from '@/components/portal/pet-recognition-field'

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showPetForm, setShowPetForm] = useState(false)
  const [editingPetId, setEditingPetId] = useState<string | null>(null)
  const [uploadingDocuments, setUploadingDocuments] = useState(false)
  const [impfpassFile, setImpfpassFile] = useState<File | null>(null)
  const [wurmtestFile, setWurmtestFile] = useState<File | null>(null)
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
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null)
  const [formPhotoCount, setFormPhotoCount] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    loadPets()
  }, [])

  async function loadPets() {
    try {
      const response = await authenticatedFetch('/api/portal/pets')
      const data = await response.json()
      setPets(data.pets || [])

      const docsResponse = await authenticatedFetch('/api/portal/documents')
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
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
      })
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
      })
    }
    setImpfpassFile(null)
    setWurmtestFile(null)
    setFormPhotoCount(pet?.photo_count ?? 0)
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
        impfpassFile,
        wurmtestFile,
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
      
      const url = editingPetId 
        ? `/api/portal/pets/${editingPetId}`
        : '/api/portal/pets'
      const method = editingPetId ? 'PUT' : 'POST'
      
      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petFormData),
      })

      if (!response.ok) {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Speichern',
          variant: 'destructive',
        })
        setUploadingDocuments(false)
        return
      }

      const petData = await response.json()
      const savedPetId = petData.pet?.id || editingPetId

      if (!editingPetId && savedPetId) {
        setEditingPetId(savedPetId)
      }

      // Lade Dokumente hoch, falls vorhanden
      if (savedPetId) {
        const uploadPromises = []
        
        if (impfpassFile) {
          const formData = new FormData()
          formData.append('file', impfpassFile)
          formData.append('document_type', 'impfpass')
          formData.append('pet_id', savedPetId)
          
          uploadPromises.push(
            authenticatedFetch('/api/portal/documents', {
              method: 'POST',
              body: formData,
            }).catch(err => {
              console.error('Error uploading impfpass:', err)
              toast({
                title: 'Warnung',
                description: 'Impfpass konnte nicht hochgeladen werden',
                variant: 'destructive',
              })
            })
          )
        }

        if (wurmtestFile) {
          const formData = new FormData()
          formData.append('file', wurmtestFile)
          formData.append('document_type', 'wurmtest')
          formData.append('pet_id', savedPetId)
          
          uploadPromises.push(
            authenticatedFetch('/api/portal/documents', {
              method: 'POST',
              body: formData,
            }).catch(err => {
              console.error('Error uploading wurmtest:', err)
              toast({
                title: 'Warnung',
                description: 'Wurmtest konnte nicht hochgeladen werden',
                variant: 'destructive',
              })
            })
          )
        }

        await Promise.all(uploadPromises)
      }

      await loadPets()

      const missingPhoto = (petData.pet?.photo_count ?? formPhotoCount) === 0

      if (missingPhoto) {
        setEditingPetId(savedPetId)
        setShowPetForm(true)
        toast({
          title: 'Hinweis',
          description:
            'Bitte lade noch mindestens ein Foto deines Tieres hoch – das hilft uns bei der Wiedererkennung.',
        })
      } else {
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
        })
        setImpfpassFile(null)
        setWurmtestFile(null)
        setShowPetForm(false)
        setEditingPetId(null)
        setFormPhotoCount(0)
        toast({
          title: 'Erfolg',
          description: editingPetId ? 'Tier erfolgreich aktualisiert' : 'Tier erfolgreich hinzugefügt',
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
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  const hasExistingImpfpass = editingPetId && documents.some(d => d.pet_id === editingPetId && d.document_type === 'impfpass')
  const hasExistingWurmtest = editingPetId && documents.some(d => d.pet_id === editingPetId && d.document_type === 'wurmtest')
  const petsWithoutPhotos = getPetsWithoutPhotos(pets)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">Meine Tiere</h1>
        <p className="mt-2 text-sage-600">Verwalte deine Tiere</p>
      </div>

      {petsWithoutPhotos.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Tierfoto fehlt</CardTitle>
            <CardDescription className="text-amber-700">
              Für {petsWithoutPhotos.map((pet) => pet.name).join(', ')} ist noch kein Foto hinterlegt.
              Bitte ergänze mindestens ein Bild zur sicheren Wiedererkennung.
            </CardDescription>
          </CardHeader>
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
                <div>
                  <Label htmlFor="pet-geschlecht">Geschlecht</Label>
                  <Select
                    value={petFormData.geschlecht || ''}
                    onValueChange={(value) => setPetFormData({ ...petFormData, geschlecht: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Geschlecht wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hündin">Hündin</SelectItem>
                      <SelectItem value="rüde">Rüde</SelectItem>
                      <SelectItem value="rüde_kastriert">Rüde - kastiert</SelectItem>
                      <SelectItem value="rüde_kastriert_gechipt">Rüde - kastiert - gechipt</SelectItem>
                      <SelectItem value="hündin_kastriert">Hündin - kastriert</SelectItem>
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
                petId={editingPetId}
                onPhotoCountChange={(count) => {
                  setFormPhotoCount(count)
                  if (count > 0) void loadPets()
                }}
              />

              {/* Tier-Informationen */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-sage-900">Tier-Informationen</h3>
                <div>
                  <Label htmlFor="pet-futtermenge">Futtermenge</Label>
                  <Textarea
                    id="pet-futtermenge"
                    value={petFormData.futtermenge || ''}
                    onChange={(e) => setPetFormData({ ...petFormData, futtermenge: e.target.value })}
                    rows={3}
                    placeholder="z.B. 200g Trockenfutter morgens, 150g abends"
                  />
                </div>
                <div>
                  <Label htmlFor="pet-medikamente">Medikamente</Label>
                  <Textarea
                    id="pet-medikamente"
                    value={petFormData.medikamente || ''}
                    onChange={(e) => setPetFormData({ ...petFormData, medikamente: e.target.value })}
                    rows={3}
                    placeholder="z.B. Tabletten gegen Arthrose, täglich morgens"
                  />
                </div>
                <div>
                  <Label htmlFor="pet-besonderheiten">Besonderheiten</Label>
                  <Textarea
                    id="pet-besonderheiten"
                    value={petFormData.besonderheiten || ''}
                    onChange={(e) => setPetFormData({ ...petFormData, besonderheiten: e.target.value })}
                    rows={3}
                    placeholder="z.B. Allergien, Verhaltensbesonderheiten, etc."
                  />
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Intervalle</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!isDog(petFormData.tierart) && (
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
                    )}
                    <div>
                      <Label htmlFor="pet-intervall-entwurmung">Intervall Entwurmung/Testung</Label>
                      <Select
                        value={petFormData.intervall_entwurmung || ''}
                        onValueChange={(value) => setPetFormData({ ...petFormData, intervall_entwurmung: value })}
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
              </div>

              {/* Dokumente & Vorsorge */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-sage-900">Dokumente & Vorsorge</h3>
                
                <PetVaccinationSection
                  values={petFormData}
                  onChange={(updates) => setPetFormData({ ...petFormData, ...updates })}
                  idPrefix="pet"
                  hasExistingImpfpass={!!hasExistingImpfpass}
                  impfpassFile={impfpassFile}
                  onImpfpassChange={setImpfpassFile}
                />

                {/* Wurmtest Bereich */}
                <div className="p-4 bg-sage-50/50 rounded-lg border border-sage-100 space-y-4">
                  <h4 className="font-semibold text-sm text-sage-800 border-b pb-1">Wurmtest & Entwurmung</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pet-wurmtest">
                        Wurmtest (Foto aufnehmen, Bild oder PDF){' '}
                        {hasExistingWurmtest ? '(bereits hochgeladen)' : '(später nachreichbar)'}
                      </Label>
                      <Input
                        id="pet-wurmtest"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          setWurmtestFile(file || null)
                        }}
                      />
                      {wurmtestFile && (
                        <p className="text-sm text-sage-600 mt-1">
                          Ausgewählt: {wurmtestFile.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="pet-stuhlprobe">
                        Datum der letzten Entwurmung/Stuhlprobe (später nachreichbar)
                      </Label>
                      <Input
                        id="pet-stuhlprobe"
                        type="date"
                        value={petFormData.letzte_stuhlprobe || ''}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setPetFormData({ ...petFormData, letzte_stuhlprobe: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSavePet}
                  disabled={!petFormData.name || !petFormData.tierart || uploadingDocuments}
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
                    })
                    setImpfpassFile(null)
                    setWurmtestFile(null)
                    setFormPhotoCount(0)
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
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-lg">{pet.name}</p>
                      <p className="text-sm text-sage-600">
                        {[pet.tierart, pet.rasse, pet.farbe, pet.geschlecht].filter(Boolean).join(' • ')}
                      </p>
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
                  {(pet.futtermenge || pet.medikamente || pet.besonderheiten || pet.intervall_impfung || pet.intervall_entwurmung || pet.letzte_stuhlprobe) && (
                    <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                      {pet.letzte_stuhlprobe && (
                        <div>
                          <p className="text-xs font-semibold text-sage-600">Letzte Entwurmung/Stuhlprobe:</p>
                          <p className="text-sm text-sage-700">
                            {new Date(pet.letzte_stuhlprobe).toLocaleDateString('de-DE')}
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
                          {pet.intervall_entwurmung && (
                            <div>
                              <p className="text-xs font-semibold text-sage-600">Entwurmung:</p>
                              <p className="text-sm text-sage-700">{pet.intervall_entwurmung}</p>
                            </div>
                          )}
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
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
