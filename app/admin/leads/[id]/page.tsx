'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import type { Contact, ContactNote } from '@/lib/types'
import { PropertyEditor } from '@/components/admin/property-editor'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string
  const { toast } = useToast()

  const [lead, setLead] = useState<Contact | null>(null)
  const [notes, setNotes] = useState<ContactNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (leadId) {
      loadLead()
      loadNotes()
    }
  }, [leadId])

  async function loadLead() {
    try {
      const response = await fetch('/api/admin/leads', {
        credentials: 'include',
      })
      const data = await response.json()

      if (data.leads) {
        const foundLead = data.leads.find((l: Contact) => String(l.id) === String(leadId))
        if (foundLead) {
          setLead(foundLead)
        } else {
          toast({
            title: 'Fehler',
            description: 'Lead nicht gefunden',
            variant: 'destructive',
          })
          router.push('/admin/leads')
        }
      }
    } catch (error) {
      console.error('Error loading lead:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden des Leads',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadNotes() {
    try {
      const response = await fetch(`/api/admin/leads/${leadId}/notes`, {
        credentials: 'include',
      })
      const data = await response.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  async function updateLeadStatus(status: string) {
    try {
      const response = await fetch('/api/admin/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status }),
        credentials: 'include',
      })

      if (response.ok) {
        const updated = await response.json()
        setLead(updated.lead)
        toast({
          title: 'Erfolg',
          description: 'Status aktualisiert',
        })
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Aktualisieren',
        variant: 'destructive',
      })
    }
  }

  async function addNote() {
    if (!newNote.trim()) {
      toast({
        title: 'Hinweis',
        description: 'Bitte geben Sie eine Notiz ein',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setNotes([data.note, ...notes])
        setNewNote('')
        toast({
          title: 'Erfolg',
          description: 'Notiz hinzugefügt',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Hinzufügen der Notiz',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      console.error('Error adding note:', error)
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Hinzufügen der Notiz',
        variant: 'destructive',
      })
    }
  }


  async function convertToCustomer() {
    if (!lead) return

    try {
      const response = await fetch(`/api/admin/leads/${lead.id}/convert`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Lead erfolgreich konvertiert',
          description: 'Weiterleitung zur Kundendetailseite...',
        })
        // Weiterleitung zur Kundendetailseite
        if (data.customer_id) {
          router.push(`/admin/customers/${data.customer_id}`)
        } else {
          // Fallback: Zur Kundenübersicht, wenn keine customer_id vorhanden
          router.push('/admin/customers')
        }
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler bei der Konvertierung',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error converting lead:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler bei der Konvertierung',
        variant: 'destructive',
      })
    }
  }

  async function markAsLost() {
    if (!lead) return
    try {
      const response = await fetch('/api/admin/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, contact_type: 'lost', status: null }),
        credentials: 'include',
      })
      if (response.ok) {
        toast({ title: 'Als verloren markiert' })
        router.push('/admin/leads')
      } else {
        const err = await response.json()
        toast({ title: 'Fehler', description: err.error || '', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', variant: 'destructive' })
    }
  }

  async function deleteLead() {
    if (!lead) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/admin/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id }),
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Löschen des Leads')
      }

      toast({ title: 'Lead gelöscht' })
      router.push('/admin/leads')
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Löschen des Leads',
        variant: 'destructive',
      })
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

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-sage-600">Lead nicht gefunden</p>
        <Link href="/admin/leads">
          <Button variant="outline" className="mt-4">
            Zurück zur Übersicht
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/leads">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-sage-900">
            Lead: {lead.nachname} {lead.vorname}
          </h1>
          <p className="mt-2 text-sage-600">Lead-Details und Verwaltung</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead-Informationen */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Kontaktinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <p className="text-sage-900 font-medium">{lead.nachname} {lead.vorname}</p>
            </div>
            <div>
              <Label>E-Mail</Label>
              <p className="text-sage-900">{lead.email}</p>
            </div>
            <div>
              <Label>Telefon</Label>
              <p className="text-sage-900">{lead.telefonnummer}</p>
            </div>
            <div>
              <Label>Service</Label>
              <p className="text-sage-900">{lead.service}</p>
            </div>
            {lead.pet && (
              <div>
                <Label>Tier</Label>
                <p className="text-sage-900">{lead.pet}</p>
              </div>
            )}
            <div>
              <Label>Nachricht</Label>
              <p className="text-sage-900 whitespace-pre-wrap">{lead.message}</p>
            </div>
            <div>
              <Label>Verfügbarkeit</Label>
              <p className="text-sage-900 whitespace-pre-wrap">{lead.availability}</p>
            </div>

            {/* Zusätzliche Felder für Hundepension */}
            {lead.service === 'hundepension' && (
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold">Hundepension-Details</h3>
                {lead.anzahl_tiere && (
                  <div>
                    <Label>Anzahl Tiere</Label>
                    <p className="text-sage-900">{lead.anzahl_tiere}</p>
                  </div>
                )}
                {lead.tiernamen && (
                  <div>
                    <Label>Tiernamen</Label>
                    <p className="text-sage-900">{lead.tiernamen}</p>
                  </div>
                )}
                {lead.alter_tier && (
                  <div>
                    <Label>Alter</Label>
                    <p className="text-sage-900">{lead.alter_tier}</p>
                  </div>
                )}
                {lead.intakt_kastriert && (
                  <div>
                    <Label>Intakt/Kastriert</Label>
                    <p className="text-sage-900">{lead.intakt_kastriert}</p>
                  </div>
                )}
                {lead.konkreter_urlaub && (
                  <div>
                    <Label>Konkreter Urlaub geplant</Label>
                    <p className="text-sage-900">{lead.konkreter_urlaub}</p>
                  </div>
                )}
                {lead.urlaub_von && lead.urlaub_bis && (
                  <div>
                    <Label>Urlaubszeitraum</Label>
                    <p className="text-sage-900">
                      {new Date(lead.urlaub_von).toLocaleDateString('de-DE')} - {new Date(lead.urlaub_bis).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Erstellt am</Label>
              <p className="text-sage-600 text-sm">
                {new Date(lead.created_at).toLocaleString('de-DE')}
              </p>
            </div>
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold">E-Mail-Versand</h3>
              <div>
                <Label>Interne Benachrichtigung</Label>
                <p className={lead.email_internal_status === 'sent' ? 'text-green-700' : 'text-amber-700'}>
                  {lead.email_internal_status === 'sent' ? 'Erfolgreich versendet' : lead.email_internal_status === 'failed' ? 'Versand fehlgeschlagen' : 'Kein Versandstatus vorhanden'}
                </p>
                {lead.email_internal_error && (
                  <p className="mt-1 text-sm text-red-700 whitespace-pre-wrap">{lead.email_internal_error}</p>
                )}
              </div>
              <div>
                <Label>Eingangsbestätigung an Lead</Label>
                <p className={lead.email_confirmation_status === 'sent' ? 'text-green-700' : 'text-amber-700'}>
                  {lead.email_confirmation_status === 'sent' ? 'Erfolgreich versendet' : lead.email_confirmation_status === 'failed' ? 'Versand fehlgeschlagen' : 'Kein Versandstatus vorhanden'}
                </p>
                {lead.email_confirmation_error && (
                  <p className="mt-1 text-sm text-red-700 whitespace-pre-wrap">{lead.email_confirmation_error}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status & Aktionen */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Status & Aktionen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Status</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant={lead.status === 'new' ? 'default' : 'outline'}
                  onClick={() => updateLeadStatus('new')}
                >
                  Neu
                </Button>
                <Button
                  size="sm"
                  variant={lead.status === 'contacted' ? 'default' : 'outline'}
                  onClick={() => updateLeadStatus('contacted')}
                >
                  Kontaktiert
                </Button>
              </div>
            </div>

            {/* Notizen */}
            <div>
              <Label>Notizen</Label>
              <div className="mt-2 space-y-2">
                {notes.length === 0 ? (
                  <p className="text-sage-600 text-center py-4 text-sm">Keine Notizen vorhanden</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="p-3 bg-sage-50 rounded text-sm">
                      <p className="whitespace-pre-wrap">{note.note}</p>
                      <p className="text-xs text-sage-600 mt-1">
                        {new Date(note.created_at).toLocaleString('de-DE')}
                        {note.created_by && typeof note.created_by === 'object' && 'email' in note.created_by && (
                          ` • ${note.created_by.email}`
                        )}
                      </p>
                    </div>
                  ))
                )}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Neue Notiz hinzufügen..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={addNote} size="sm" className="w-full">
                    Notiz hinzufügen
                  </Button>
                </div>
              </div>
            </div>

            {/* Konvertieren */}
            <Button
              onClick={convertToCustomer}
              className="w-full bg-sage-600 hover:bg-sage-700"
            >
              Zum Kunden konvertieren
            </Button>
            <Button variant="outline" className="w-full" onClick={markAsLost}>
              Als verloren markieren
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Lead löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Lead endgültig löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Der Lead inklusive Notizen und zusätzlicher Eigenschaften wird dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteLead} disabled={isDeleting}>
                    {isDeleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {/* Eigenschaften */}
      <div className="mt-6">
        <PropertyEditor entityType="lead" entityId={leadId.toString()} />
      </div>
    </div>
  )
}
