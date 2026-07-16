'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Trash2, GitMerge, Pencil, X, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import type { Contact, ContactNote } from '@/lib/types'
import { PropertyEditor } from '@/components/admin/property-editor'
import { NotesEditor } from '@/components/admin/notes-editor'
import { TransactionalEmailPanel } from '@/components/admin/transactional-email-panel'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

type LeadFormData = {
  vorname: string
  nachname: string
  email: string
  telefonnummer: string
  telefon_2: string
  notfall_kontakt_name: string
  notfallnummer: string
  service: string
  pet: string
  message: string
  availability: string
  anzahl_tiere: string
  tiernamen: string
  schulferien_bw: boolean
  konkreter_urlaub: string
  urlaub_von: string
  urlaub_bis: string
  intakt_kastriert: string
  alter_tier: string
}

function leadToFormData(lead: Contact): LeadFormData {
  return {
    vorname: lead.vorname || '',
    nachname: lead.nachname || '',
    email: lead.email || '',
    telefonnummer: lead.telefonnummer || '',
    telefon_2: lead.telefon_2 || '',
    notfall_kontakt_name: lead.notfall_kontakt_name || '',
    notfallnummer: lead.notfallnummer || '',
    service: lead.service || '',
    pet: lead.pet || '',
    message: lead.message || '',
    availability: lead.availability || '',
    anzahl_tiere: lead.anzahl_tiere || '',
    tiernamen: lead.tiernamen || '',
    schulferien_bw: lead.schulferien_bw || false,
    konkreter_urlaub: lead.konkreter_urlaub || '',
    urlaub_von: lead.urlaub_von ? lead.urlaub_von.split('T')[0] : '',
    urlaub_bis: lead.urlaub_bis ? lead.urlaub_bis.split('T')[0] : '',
    intakt_kastriert: lead.intakt_kastriert || '',
    alter_tier: lead.alter_tier || '',
  }
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string
  const { toast } = useToast()

  const [lead, setLead] = useState<Contact | null>(null)
  const [notes, setNotes] = useState<ContactNote[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [allLeads, setAllLeads] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSourceLeadId, setSelectedSourceLeadId] = useState<string | null>(null)
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<LeadFormData | null>(null)
  const [savingContact, setSavingContact] = useState(false)

  useEffect(() => {
    if (leadId) {
      loadLead()
      loadNotes()
    }
  }, [leadId])

  async function loadLead() {
    try {
      const response = await authenticatedFetch('/api/admin/leads', {
        credentials: 'include',
      })
      const data = await response.json()

      if (data.leads) {
        setAllLeads(data.leads)
        const foundLead = data.leads.find((l: Contact) => String(l.id) === String(leadId))
        if (foundLead) {
          setLead(foundLead)
          setFormData(leadToFormData(foundLead))
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
      const response = await authenticatedFetch(`/api/admin/leads/${leadId}/notes`, {
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
      const response = await authenticatedFetch('/api/admin/leads', {
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

  async function saveContactDetails() {
    if (!lead || !formData) return

    setSavingContact(true)
    try {
      const response = await authenticatedFetch('/api/admin/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leadId,
          ...formData,
          urlaub_von: formData.urlaub_von || null,
          urlaub_bis: formData.urlaub_bis || null,
        }),
        credentials: 'include',
      })

      if (response.ok) {
        const updated = await response.json()
        setLead(updated.lead)
        setFormData(leadToFormData(updated.lead))
        setIsEditing(false)
        toast({ title: 'Erfolg', description: 'Kontaktdaten gespeichert' })
      } else {
        const error = await response.json()
        toast({ title: 'Fehler', description: error.error || 'Fehler beim Speichern', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Fehler beim Speichern', variant: 'destructive' })
    } finally {
      setSavingContact(false)
    }
  }

  function cancelEdit() {
    if (lead) {
      setFormData(leadToFormData(lead))
    }
    setIsEditing(false)
  }

  async function convertToCustomer() {
    if (!lead) return

    try {
      const response = await authenticatedFetch(`/api/admin/leads/${lead.id}/convert`, {
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
      const response = await authenticatedFetch('/api/admin/leads', {
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
      const response = await authenticatedFetch('/api/admin/leads', {
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

  async function handleMerge() {
    if (!selectedSourceLeadId || !lead) return

    setIsMerging(true)
    try {
      const response = await authenticatedFetch(`/api/admin/leads/${lead.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceLeadId: selectedSourceLeadId }),
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Zusammenführen der Leads')
      }

      toast({
        title: 'Erfolg',
        description: 'Leads wurden erfolgreich zusammengeführt',
      })
      setIsMergeDialogOpen(false)
      setSelectedSourceLeadId(null)
      setSearchQuery('')
      loadLead()
      loadNotes()
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Zusammenführen der Leads',
        variant: 'destructive',
      })
    } finally {
      setIsMerging(false)
    }
  }

  const filteredLeads = allLeads
    .filter((l) => String(l.id) !== String(leadId))
    .filter((l) => {
      const name = `${l.vorname || ''} ${l.nachname || ''}`.toLowerCase()
      const email = (l.email || '').toLowerCase()
      const query = searchQuery.toLowerCase()
      return name.includes(query) || email.includes(query)
    })

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
            Lead: {lead.vorname} {lead.nachname}
          </h1>
          <p className="mt-2 text-sage-600">Lead-Details und Verwaltung</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead-Informationen */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kontaktinformationen</CardTitle>
            {!isEditing ? (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" />
                Bearbeiten
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveContactDetails} disabled={savingContact}>
                  <Check className="h-4 w-4 mr-1" />
                  {savingContact ? 'Speichern…' : 'Speichern'}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={savingContact}>
                  <X className="h-4 w-4 mr-1" />
                  Abbrechen
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {formData && isEditing ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Vorname</Label>
                    <Input value={formData.vorname} onChange={(e) => setFormData({ ...formData, vorname: e.target.value })} />
                  </div>
                  <div>
                    <Label>Nachname</Label>
                    <Input value={formData.nachname} onChange={(e) => setFormData({ ...formData, nachname: e.target.value })} />
                  </div>
                  <div>
                    <Label>E-Mail</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input value={formData.telefonnummer} onChange={(e) => setFormData({ ...formData, telefonnummer: e.target.value })} />
                  </div>
                  <div>
                    <Label>2. Telefon</Label>
                    <Input value={formData.telefon_2} onChange={(e) => setFormData({ ...formData, telefon_2: e.target.value })} />
                  </div>
                  <div>
                    <Label>Service</Label>
                    <Input value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tier</Label>
                    <Input value={formData.pet} onChange={(e) => setFormData({ ...formData, pet: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Nachricht</Label>
                  <Textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={3} />
                </div>
                <div>
                  <Label>Verfügbarkeit</Label>
                  <Textarea value={formData.availability} onChange={(e) => setFormData({ ...formData, availability: e.target.value })} rows={2} />
                </div>
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Notfallkontakt</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={formData.notfall_kontakt_name} onChange={(e) => setFormData({ ...formData, notfall_kontakt_name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Nummer</Label>
                      <Input value={formData.notfallnummer} onChange={(e) => setFormData({ ...formData, notfallnummer: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Urlaubsbetreuung-Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Anzahl Tiere</Label>
                      <Input value={formData.anzahl_tiere} onChange={(e) => setFormData({ ...formData, anzahl_tiere: e.target.value })} />
                    </div>
                    <div>
                      <Label>Tiernamen</Label>
                      <Input value={formData.tiernamen} onChange={(e) => setFormData({ ...formData, tiernamen: e.target.value })} />
                    </div>
                    <div>
                      <Label>Alter Tier</Label>
                      <Input value={formData.alter_tier} onChange={(e) => setFormData({ ...formData, alter_tier: e.target.value })} />
                    </div>
                    <div>
                      <Label>Intakt/Kastriert</Label>
                      <Input value={formData.intakt_kastriert} onChange={(e) => setFormData({ ...formData, intakt_kastriert: e.target.value })} />
                    </div>
                    <div>
                      <Label>Konkreter Urlaub</Label>
                      <Input value={formData.konkreter_urlaub} onChange={(e) => setFormData({ ...formData, konkreter_urlaub: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Checkbox
                        checked={formData.schulferien_bw}
                        onCheckedChange={(checked) => setFormData({ ...formData, schulferien_bw: checked === true })}
                      />
                      <Label>Schulferien BW</Label>
                    </div>
                    <div>
                      <Label>Urlaub von</Label>
                      <Input type="date" value={formData.urlaub_von} onChange={(e) => setFormData({ ...formData, urlaub_von: e.target.value })} />
                    </div>
                    <div>
                      <Label>Urlaub bis</Label>
                      <Input type="date" value={formData.urlaub_bis} onChange={(e) => setFormData({ ...formData, urlaub_bis: e.target.value })} />
                    </div>
                  </div>
                </div>
              </>
            ) : formData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <p className="text-sage-900 font-medium">{formData.vorname} {formData.nachname}</p>
                  </div>
                  <div>
                    <Label>E-Mail</Label>
                    <p className="text-sage-900">{formData.email}</p>
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <p className="text-sage-900">{formData.telefonnummer || '-'}</p>
                  </div>
                  <div>
                    <Label>2. Telefon</Label>
                    <p className="text-sage-900">{formData.telefon_2 || '-'}</p>
                  </div>
                  <div>
                    <Label>Service</Label>
                    <p className="text-sage-900">{formData.service}</p>
                  </div>
                  {formData.pet && (
                    <div>
                      <Label>Tier</Label>
                      <p className="text-sage-900">{formData.pet}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Nachricht</Label>
                  <p className="text-sage-900 whitespace-pre-wrap">{formData.message}</p>
                </div>
                <div>
                  <Label>Verfügbarkeit</Label>
                  <p className="text-sage-900 whitespace-pre-wrap">{formData.availability}</p>
                </div>
                {(formData.notfall_kontakt_name || formData.notfallnummer) && (
                  <div className="border-t pt-4 space-y-2">
                    <h3 className="font-semibold">Notfallkontakt</h3>
                    <p className="text-sage-900">{formData.notfall_kontakt_name || '-'} • {formData.notfallnummer || '-'}</p>
                  </div>
                )}
                {(formData.anzahl_tiere || formData.tiernamen || formData.alter_tier || formData.urlaub_von) && (
                  <div className="border-t pt-4 space-y-2">
                    <h3 className="font-semibold">Urlaubsbetreuung-Details</h3>
                    {formData.anzahl_tiere && <p><Label>Anzahl Tiere</Label><span className="text-sage-900 ml-2">{formData.anzahl_tiere}</span></p>}
                    {formData.tiernamen && <p><Label>Tiernamen</Label><span className="text-sage-900 ml-2">{formData.tiernamen}</span></p>}
                    {formData.alter_tier && <p><Label>Alter</Label><span className="text-sage-900 ml-2">{formData.alter_tier}</span></p>}
                    {formData.intakt_kastriert && <p><Label>Intakt/Kastriert</Label><span className="text-sage-900 ml-2">{formData.intakt_kastriert}</span></p>}
                    {formData.konkreter_urlaub && <p><Label>Konkreter Urlaub</Label><span className="text-sage-900 ml-2">{formData.konkreter_urlaub}</span></p>}
                    {formData.urlaub_von && formData.urlaub_bis && (
                      <p><Label>Urlaubszeitraum</Label><span className="text-sage-900 ml-2">{new Date(formData.urlaub_von).toLocaleDateString('de-DE')} - {new Date(formData.urlaub_bis).toLocaleDateString('de-DE')}</span></p>
                    )}
                  </div>
                )}
              </>
            ) : null}

            <div>
              <Label>Erstellt am</Label>
              <p className="text-sage-600 text-sm">
                {new Date(lead.created_at).toLocaleString('de-DE')}
              </p>
            </div>
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold">Transaktionale E-Mails (automatisch)</h3>
              <p className="text-xs text-sage-500">
                System-E-Mails bei Lead-Eingang (automatisch).
              </p>
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
              <div className="mt-2">
                <NotesEditor
                  notesApiPath={`/api/admin/leads/${leadId}/notes`}
                  notes={notes}
                  onNotesChange={setNotes}
                />
              </div>
            </div>

            {/* Konvertieren */}
            <Button
              onClick={convertToCustomer}
              className="w-full bg-sage-600 hover:bg-sage-700"
            >
              Zum Kunden konvertieren
            </Button>
            
            <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <GitMerge className="mr-2 h-4 w-4" />
                  Lead zusammenführen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Leads zusammenführen</DialogTitle>
                  <DialogDescription>
                    Wähle einen Lead aus, der in diesen Lead (<strong>{lead.vorname} {lead.nachname}</strong>) integriert werden soll. Der ausgewählte Lead wird danach unwiderruflich gelöscht.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 my-4">
                  <Input
                    placeholder="Nach Name oder E-Mail suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  
                  <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                    {filteredLeads.length === 0 ? (
                      <p className="text-sm text-sage-600 text-center py-4">Keine passenden Leads gefunden</p>
                    ) : (
                      filteredLeads.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => setSelectedSourceLeadId(l.id)}
                          className={`p-3 text-sm cursor-pointer transition-colors flex justify-between items-center ${
                            selectedSourceLeadId === l.id
                              ? 'bg-sage-100 text-sage-900 font-medium'
                              : 'hover:bg-sage-50 text-sage-800'
                          }`}
                        >
                          <div>
                            <p>{l.vorname} {l.nachname}</p>
                            <p className="text-xs text-sage-500">{l.email || 'Keine E-Mail'} • {l.telefonnummer || 'Keine Telefonnummer'}</p>
                          </div>
                          {selectedSourceLeadId === l.id && (
                            <span className="text-sage-600 text-xs font-semibold">Ausgewählt</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsMergeDialogOpen(false)
                    setSelectedSourceLeadId(null)
                    setSearchQuery('')
                  }}>
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleMerge}
                    disabled={!selectedSourceLeadId || isMerging}
                    className="bg-sage-600 hover:bg-sage-700"
                  >
                    {isMerging ? 'Wird zusammengeführt...' : 'Zusammenführen & Löschen'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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

      <TransactionalEmailPanel
        contactId={leadId}
        recipientEmail={lead.email}
        recipientName={[lead.vorname, lead.nachname].filter(Boolean).join(' ') || lead.email}
      />

      {/* Eigenschaften */}
      <div className="mt-6">
        <PropertyEditor entityType="lead" entityId={leadId.toString()} />
      </div>
    </div>
  )
}
