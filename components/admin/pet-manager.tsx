'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { Pet } from '@/lib/types'
import {
  PET_TIERART_OPTIONS,
  PET_GESCHLECHT_OPTIONS,
  INTERVALL_OPTIONS,
} from '@/lib/pet-form-options'
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

const emptyPetForm = {
  name: '',
  tierart: '',
  geschlecht: '',
  letzte_impfung: '',
  letzte_impfung_zusatz: '',
  futtermenge: '',
  medikamente: '',
  besonderheiten: '',
  intervall_impfung: '',
  intervall_entwurmung: '',
  letzte_stuhlprobe: '',
}

interface PetManagerProps {
  customerId: string
  pets: Pet[]
  onPetsChange: (pets: Pet[]) => void
}

export function PetManager({ customerId, pets, onPetsChange }: PetManagerProps) {
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyPetForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditingId(null)
    setFormData(emptyPetForm)
    setShowForm(true)
  }

  function openEdit(pet: Pet) {
    setEditingId(pet.id)
    setFormData({
      name: pet.name || '',
      tierart: pet.tierart || '',
      geschlecht: pet.geschlecht || '',
      letzte_impfung: pet.letzte_impfung ? pet.letzte_impfung.split('T')[0] : '',
      letzte_impfung_zusatz: pet.letzte_impfung_zusatz ? pet.letzte_impfung_zusatz.split('T')[0] : '',
      futtermenge: pet.futtermenge || '',
      medikamente: pet.medikamente || '',
      besonderheiten: pet.besonderheiten || '',
      intervall_impfung: pet.intervall_impfung || '',
      intervall_entwurmung: pet.intervall_entwurmung || '',
      letzte_stuhlprobe: pet.letzte_stuhlprobe ? pet.letzte_stuhlprobe.split('T')[0] : '',
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyPetForm)
  }

  async function savePet() {
    if (!formData.name.trim()) {
      toast({ title: 'Fehler', description: 'Name ist erforderlich', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        letzte_impfung: formData.letzte_impfung || null,
        letzte_impfung_zusatz: formData.letzte_impfung_zusatz || null,
        letzte_stuhlprobe: formData.letzte_stuhlprobe || null,
      }

      const response = editingId
        ? await authenticatedFetch(`/api/admin/pets/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include',
          })
        : await authenticatedFetch('/api/admin/pets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: customerId, ...payload }),
            credentials: 'include',
          })

      if (response.ok) {
        const data = await response.json()
        if (editingId) {
          onPetsChange(pets.map((p) => (p.id === editingId ? data.pet : p)))
        } else {
          onPetsChange([data.pet, ...pets])
        }
        cancelForm()
        toast({ title: 'Erfolg', description: editingId ? 'Tier aktualisiert' : 'Tier angelegt' })
      } else {
        const error = await response.json()
        toast({ title: 'Fehler', description: error.error || 'Fehler beim Speichern', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Fehler beim Speichern des Tieres', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return

    setSaving(true)
    try {
      const response = await authenticatedFetch(`/api/admin/pets/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        onPetsChange(pets.filter((p) => p.id !== deleteId))
        setDeleteId(null)
        toast({ title: 'Erfolg', description: 'Tier gelöscht' })
      } else {
        const error = await response.json()
        toast({ title: 'Fehler', description: error.error || 'Fehler beim Löschen', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Fehler beim Löschen des Tieres', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tiere ({pets.length})</CardTitle>
        {!showForm && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Tier hinzufügen
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="p-4 border border-sage-200 rounded-lg space-y-4">
            <h3 className="font-semibold">{editingId ? 'Tier bearbeiten' : 'Neues Tier'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Name des Tieres"
                />
              </div>
              <div>
                <Label>Tierart</Label>
                <Select value={formData.tierart} onValueChange={(v) => setFormData({ ...formData, tierart: v })}>
                  <SelectTrigger><SelectValue placeholder="Tierart wählen" /></SelectTrigger>
                  <SelectContent>
                    {PET_TIERART_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Geschlecht</Label>
                <Select value={formData.geschlecht} onValueChange={(v) => setFormData({ ...formData, geschlecht: v })}>
                  <SelectTrigger><SelectValue placeholder="Geschlecht wählen" /></SelectTrigger>
                  <SelectContent>
                    {PET_GESCHLECHT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Futtermenge</Label>
              <Textarea value={formData.futtermenge} onChange={(e) => setFormData({ ...formData, futtermenge: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Medikamente</Label>
              <Textarea value={formData.medikamente} onChange={(e) => setFormData({ ...formData, medikamente: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Besonderheiten</Label>
              <Textarea value={formData.besonderheiten} onChange={(e) => setFormData({ ...formData, besonderheiten: e.target.value })} rows={2} />
            </div>
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-semibold text-sm text-sage-800">Intervalle</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Intervall Impfung</Label>
                  <Select value={formData.intervall_impfung} onValueChange={(v) => setFormData({ ...formData, intervall_impfung: v })}>
                    <SelectTrigger><SelectValue placeholder="Intervall wählen" /></SelectTrigger>
                    <SelectContent>
                      {INTERVALL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Intervall Entwurmung</Label>
                  <Select value={formData.intervall_entwurmung} onValueChange={(v) => setFormData({ ...formData, intervall_entwurmung: v })}>
                    <SelectTrigger><SelectValue placeholder="Intervall wählen" /></SelectTrigger>
                    <SelectContent>
                      {INTERVALL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Letzte Impfung</Label>
                  <Input type="date" value={formData.letzte_impfung} onChange={(e) => setFormData({ ...formData, letzte_impfung: e.target.value })} />
                </div>
                <div>
                  <Label>Letzte Entw./Stuhlpr.</Label>
                  <Input type="date" value={formData.letzte_stuhlprobe} onChange={(e) => setFormData({ ...formData, letzte_stuhlprobe: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={savePet} disabled={saving}>{saving ? 'Speichern…' : 'Speichern'}</Button>
              <Button variant="outline" onClick={cancelForm} disabled={saving}>Abbrechen</Button>
            </div>
          </div>
        )}

        {pets.length > 0 ? (
          <div className="space-y-4">
            {pets.map((pet) => (
              <div key={pet.id} className="p-4 border border-sage-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{pet.name}</h3>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(pet)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(pet.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {pet.tierart && <div><span className="text-sage-500">Tierart:</span> {pet.tierart}</div>}
                  {pet.geschlecht && <div><span className="text-sage-500">Geschlecht:</span> {pet.geschlecht}</div>}
                  {pet.futtermenge && <div className="col-span-2"><span className="text-sage-500">Futtermenge:</span> {pet.futtermenge}</div>}
                  {pet.medikamente && <div className="col-span-2"><span className="text-sage-500">Medikamente:</span> {pet.medikamente}</div>}
                  {pet.besonderheiten && <div className="col-span-2"><span className="text-sage-500">Besonderheiten:</span> {pet.besonderheiten}</div>}
                </div>
                {(pet.intervall_impfung || pet.intervall_entwurmung || pet.letzte_impfung || pet.letzte_stuhlprobe) && (
                  <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                    <p className="text-xs font-semibold text-sage-600 uppercase tracking-wide">Intervalle</p>
                    <div className="grid grid-cols-2 gap-2">
                      {pet.intervall_impfung && (
                        <div><span className="text-sage-500">Intervall Impfung:</span> {pet.intervall_impfung}</div>
                      )}
                      {pet.intervall_entwurmung && (
                        <div><span className="text-sage-500">Intervall Entwurmung:</span> {pet.intervall_entwurmung}</div>
                      )}
                      {pet.letzte_impfung && (
                        <div><span className="text-sage-500">Letzte Impfung:</span> {new Date(pet.letzte_impfung).toLocaleDateString('de-DE')}</div>
                      )}
                      {pet.letzte_stuhlprobe && (
                        <div><span className="text-sage-500">Letzte Entw./Stuhlpr.:</span> {new Date(pet.letzte_stuhlprobe).toLocaleDateString('de-DE')}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          !showForm && <p className="text-sage-600 text-center py-4">Keine Tiere registriert</p>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tier löschen?</AlertDialogTitle>
            <AlertDialogDescription>Das Tier wird dauerhaft entfernt.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={saving}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
