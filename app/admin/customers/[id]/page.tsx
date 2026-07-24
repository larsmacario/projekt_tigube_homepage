'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Trash2, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'
import type { Customer, Pet, Document, BookingRequest, ContactNote } from '@/lib/types'
import { PropertyEditor } from '@/components/admin/property-editor'
import { NotesEditor } from '@/components/admin/notes-editor'
import { PetManager } from '@/components/admin/pet-manager'
import { DocumentManager } from '@/components/admin/document-manager'
import { INTERVALL_OPTIONS } from '@/lib/pet-form-options'
import { TransactionalEmailPanel } from '@/components/admin/transactional-email-panel'
import { useToast } from '@/hooks/use-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { CollapsibleAdminCard } from '@/components/admin/collapsible-admin-card'
import {
  emptyPriceOverrideForm,
  formToOverrideRow,
  overrideRowToForm,
  PriceOverrideEditorRow,
  type PriceOverrideFormState,
} from '@/components/admin/price-override-editor'
import type { PriceOverrideRow } from '@/lib/price-override'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type CustomerFormData = {
  vorname: string
  nachname: string
  email: string
  telefonnummer: string
  telefon_2: string
  strasse: string
  hausnummer: string
  plz: string
  ort: string
  kundennummer: string
  notfall_kontakt_name: string
  notfallnummer: string
  futtermenge: string
  medikamente: string
  besonderheiten: string
  intervall_impfung: string
  intervall_entwurmung: string
}

function customerToFormData(customer: Customer): CustomerFormData {
  return {
    vorname: customer.vorname || '',
    nachname: customer.nachname || '',
    email: customer.email || '',
    telefonnummer: customer.telefonnummer || '',
    telefon_2: customer.telefon_2 || '',
    strasse: customer.strasse || '',
    hausnummer: customer.hausnummer || '',
    plz: customer.plz || '',
    ort: customer.ort || '',
    kundennummer: customer.kundennummer || '',
    notfall_kontakt_name: customer.notfall_kontakt_name || '',
    notfallnummer: customer.notfallnummer || '',
    futtermenge: customer.futtermenge || '',
    medikamente: customer.medikamente || '',
    besonderheiten: customer.besonderheiten || '',
    intervall_impfung: customer.intervall_impfung || '',
    intervall_entwurmung: customer.intervall_entwurmung || '',
  }
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string
  const { toast } = useToast()

  const [customer, setCustomer] = useState<(Customer & { pets?: Pet[], documents?: Document[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<ContactNote[]>([])
  const [onboardingToken, setOnboardingToken] = useState<{ token: string; url: string } | null>(null)
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData | null>(null)
  const [savingContact, setSavingContact] = useState(false)
  const [resendingContractEmail, setResendingContractEmail] = useState(false)

  const [groups, setGroups] = useState<any[]>([])
  const [defaultPrices, setDefaultPrices] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [customerPriceForms, setCustomerPriceForms] = useState<Record<string, PriceOverrideFormState>>({})
  const [groupPriceOverrides, setGroupPriceOverrides] = useState<Record<string, PriceOverrideRow>>({})
  const [savingPrices, setSavingPrices] = useState(false)

  useEffect(() => {
    if (customerId) {
      loadCustomer()
      loadNotes()
      loadBookings()
      loadGroupsAndPrices()
    }
  }, [customerId])

  async function loadGroupsAndPrices() {
    try {
      const [groupsRes, defaultPricesRes, customerPricesRes] = await Promise.all([
        authenticatedFetch('/api/admin/customer-groups'),
        authenticatedFetch('/api/admin/prices'),
        authenticatedFetch(`/api/admin/customer-prices?customer_id=${customerId}`)
      ])
      
      const groupsData = await groupsRes.json()
      setGroups(groupsData.groups || [])
      
      const defaultPricesData = await defaultPricesRes.json()
      setDefaultPrices(defaultPricesData.prices || [])
      setCategories(defaultPricesData.categories || [])

      const customerPricesData = await customerPricesRes.json()
      const formsMap: Record<string, PriceOverrideFormState> = {}
      if (customerPricesData.overrides) {
        customerPricesData.overrides.forEach((o: PriceOverrideRow) => {
          formsMap[o.price_id] = overrideRowToForm(o)
        })
      }
      setCustomerPriceForms(formsMap)
    } catch (error) {
      console.error('Error loading groups or prices:', error)
    }
  }

  async function loadGroupPriceOverrides(groupId: string | null) {
    if (!groupId) {
      setGroupPriceOverrides({})
      return
    }
    try {
      const groupPricesRes = await authenticatedFetch(
        `/api/admin/group-prices?group_id=${groupId}`
      )
      const groupPricesData = await groupPricesRes.json()
      const groupMap: Record<string, PriceOverrideRow> = {}
      if (groupPricesData.overrides) {
        groupPricesData.overrides.forEach((o: PriceOverrideRow) => {
          groupMap[o.price_id] = o
        })
      }
      setGroupPriceOverrides(groupMap)
    } catch (error) {
      console.error('Error loading group price overrides:', error)
    }
  }

  useEffect(() => {
    if (customer) {
      loadGroupPriceOverrides(customer.customer_group_id ?? null)
    }
  }, [customer?.id, customer?.customer_group_id])

  async function handleGroupChange(value: string) {
    const groupId = value === 'none' ? null : value
    try {
      const response = await authenticatedFetch(`/api/admin/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_group_id: groupId }),
        credentials: 'include',
      })

      if (response.ok) {
        setCustomer(prev => prev ? { ...prev, customer_group_id: groupId } : null)
        await loadGroupPriceOverrides(groupId)
        toast({
          title: 'Erfolg',
          description: 'Kundengruppe erfolgreich aktualisiert',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Aktualisieren der Kundengruppe',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating customer group:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Aktualisieren der Kundengruppe',
        variant: 'destructive',
      })
    }
  }

  async function handleSavePrices() {
    setSavingPrices(true)
    try {
      const overrides = Object.entries(customerPriceForms)
        .map(([price_id, form]) => formToOverrideRow(price_id, form))
        .filter(Boolean)

      const response = await authenticatedFetch('/api/admin/customer-prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          overrides,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Erfolg',
          description: 'Individuelle Preise erfolgreich gespeichert',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Speichern',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving customer prices:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern der Preise',
        variant: 'destructive',
      })
    } finally {
      setSavingPrices(false)
    }
  }

  async function handleResendContractEmail() {
    setResendingContractEmail(true)
    try {
      const response = await authenticatedFetch(
        `/api/admin/customers/${customerId}/resend-contract-email`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Vertrags-Mail gesendet',
          description: `Die Vertrags-Mail wurde an ${data.email} gesendet.`,
        })
        await loadCustomer()
      } else {
        toast({
          title: 'Versand fehlgeschlagen',
          description: data.error || 'Die Vertrags-Mail konnte nicht gesendet werden.',
          variant: 'destructive',
        })
        await loadCustomer()
      }
    } catch (error) {
      console.error('Error resending contract email:', error)
      toast({
        title: 'Fehler',
        description: 'Die Vertrags-Mail konnte nicht gesendet werden.',
        variant: 'destructive',
      })
    } finally {
      setResendingContractEmail(false)
    }
  }

  function updateCustomerPriceForm(priceId: string, next: PriceOverrideFormState) {
    setCustomerPriceForms(prev => {
      const isEmpty =
        next.price === '' && next.discount_type === '' && next.discount_value === ''
      if (isEmpty) {
        const updated = { ...prev }
        delete updated[priceId]
        return updated
      }
      return { ...prev, [priceId]: next }
    })
  }

  function getCustomerPriceForm(priceId: string): PriceOverrideFormState {
    return customerPriceForms[priceId] ?? emptyPriceOverrideForm()
  }

  async function loadCustomer() {
    try {
      const response = await authenticatedFetch(`/api/admin/customers/${customerId}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error loading customer:', response.status, errorData)
        toast({
          title: 'Fehler beim Laden',
          description: errorData.error || 'Kunde konnte nicht geladen werden',
          variant: 'destructive',
        })
        router.push('/admin/customers')
        return
      }
      
      const data = await response.json()

      if (data.customer) {
        setCustomer(data.customer)
        setFormData(customerToFormData(data.customer))
        if (data.onboardingToken) {
          setOnboardingToken(data.onboardingToken)
        }
      } else {
        toast({
          title: 'Kunde nicht gefunden',
          description: 'Der angeforderte Kunde existiert nicht',
          variant: 'destructive',
        })
        router.push('/admin/customers')
      }
    } catch (error) {
      console.error('Error loading customer:', error)
      toast({
        title: 'Fehler',
        description: 'Ein unerwarteter Fehler ist aufgetreten',
        variant: 'destructive',
      })
      router.push('/admin/customers')
    } finally {
      setLoading(false)
    }
  }

  async function loadNotes() {
    try {
      const response = await authenticatedFetch(`/api/admin/customers/${customerId}/notes`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (data.notes) {
        setNotes(data.notes)
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  async function loadBookings() {
    try {
      const response = await authenticatedFetch(`/api/admin/bookings?customer_id=${customerId}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (data.bookings) {
        setBookings(data.bookings)
      }
    } catch (error) {
      console.error('Error loading bookings:', error)
    }
  }

  async function saveContactDetails() {
    if (!customer || !formData) return

    setSavingContact(true)
    try {
      const response = await authenticatedFetch(`/api/admin/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setCustomer((prev) => prev ? { ...prev, ...data.customer } : data.customer)
        setFormData(customerToFormData(data.customer))
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
    if (customer) setFormData(customerToFormData(customer))
    setIsEditing(false)
  }

  async function deleteCustomer() {
    if (!customer) return

    setIsDeleting(true)
    try {
      const response = await authenticatedFetch(`/api/admin/customers/${customer.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Löschen des Kunden')
      }

      toast({ title: 'Kunde gelöscht' })
      router.push('/admin/customers')
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Löschen des Kunden',
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

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-sage-600">Kunde nicht gefunden</p>
        <Link href="/admin/customers">
          <Button variant="outline" className="mt-4">
            Zurück zur Übersicht
          </Button>
        </Link>
      </div>
    )
  }

  const hasLegacyPetFields = !!(customer.futtermenge || customer.medikamente || customer.besonderheiten || customer.intervall_impfung || customer.intervall_entwurmung)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/customers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-sage-900">
            {customer.vorname} {customer.nachname}
          </h1>
          <p className="mt-2 text-sage-600">Kundendetails</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Persönliche Daten */}
          <CollapsibleAdminCard
            title="Persönliche Daten"
            defaultExpanded={false}
            headerActions={
              !isEditing ? (
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
              )
            }
          >
          <div className="space-y-4">
            {formData && isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kundennummer</Label>
                    <Input value={formData.kundennummer} onChange={(e) => setFormData({ ...formData, kundennummer: e.target.value })} />
                  </div>
                  <div>
                    <Label>Kundengruppe</Label>
                    <Select value={customer.customer_group_id || 'none'} onValueChange={handleGroupChange}>
                      <SelectTrigger className="mt-1 h-9 bg-white">
                        <SelectValue placeholder="Keine Gruppe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine Gruppe</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Anschrift</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Straße</Label>
                      <Input value={formData.strasse} onChange={(e) => setFormData({ ...formData, strasse: e.target.value })} />
                    </div>
                    <div>
                      <Label>Hausnummer</Label>
                      <Input value={formData.hausnummer} onChange={(e) => setFormData({ ...formData, hausnummer: e.target.value })} />
                    </div>
                    <div>
                      <Label>PLZ</Label>
                      <Input value={formData.plz} onChange={(e) => setFormData({ ...formData, plz: e.target.value })} />
                    </div>
                    <div>
                      <Label>Ort</Label>
                      <Input value={formData.ort} onChange={(e) => setFormData({ ...formData, ort: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Notfallkontakt</h3>
                  <div className="grid grid-cols-2 gap-4">
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
                {hasLegacyPetFields && (
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="font-semibold">Legacy Tier-Informationen (Kontakt-Ebene)</h3>
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
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                  </div>
                )}
              </>
            ) : formData ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-sage-500">Kundennummer</p>
                    <p className="font-medium">{formData.kundennummer || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sage-500">Kundengruppe</p>
                    <Select value={customer.customer_group_id || 'none'} onValueChange={handleGroupChange}>
                      <SelectTrigger className="mt-1 h-9 bg-white">
                        <SelectValue placeholder="Keine Gruppe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine Gruppe</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-sm text-sage-500">Vorname</p>
                    <p className="font-medium">{formData.vorname || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sage-500">Nachname</p>
                    <p className="font-medium">{formData.nachname || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sage-500">E-Mail</p>
                    <p className="font-medium">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sage-500">Telefon</p>
                    <p className="font-medium">{formData.telefonnummer || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sage-500">2. Telefon</p>
                    <p className="font-medium">{formData.telefon_2 || '-'}</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Anschrift</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-sage-500">Straße</p>
                      <p className="font-medium">{formData.strasse || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sage-500">Hausnummer</p>
                      <p className="font-medium">{formData.hausnummer || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sage-500">PLZ</p>
                      <p className="font-medium">{formData.plz || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sage-500">Ort</p>
                      <p className="font-medium">{formData.ort || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Notfallkontakt</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-sage-500">Name</p>
                      <p className="font-medium">{formData.notfall_kontakt_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sage-500">Nummer</p>
                      <p className="font-medium">{formData.notfallnummer || '-'}</p>
                    </div>
                  </div>
                </div>
                {hasLegacyPetFields && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Legacy Tier-Informationen (Kontakt-Ebene)</h3>
                    {formData.futtermenge && <div className="mb-2"><p className="text-sm text-sage-500">Futtermenge</p><p className="font-medium">{formData.futtermenge}</p></div>}
                    {formData.medikamente && <div className="mb-2"><p className="text-sm text-sage-500">Medikamente</p><p className="font-medium">{formData.medikamente}</p></div>}
                    {formData.besonderheiten && <div><p className="text-sm text-sage-500">Besonderheiten</p><p className="font-medium">{formData.besonderheiten}</p></div>}
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div><p className="text-sm text-sage-500">Intervall Impfung</p><p className="font-medium">{formData.intervall_impfung || '-'}</p></div>
                      <div><p className="text-sm text-sage-500">Intervall Entwurmung</p><p className="font-medium">{formData.intervall_entwurmung || '-'}</p></div>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-sage-500">Onboarding Status</p>
                  <Badge
                    variant={customer.onboarding_completed ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {customer.onboarding_completed ? 'Vollständig' : 'In Bearbeitung'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-sage-500">Betreuungsvertrag</p>
                  <Badge
                    variant={customer.contract_signed ? 'default' : 'destructive'}
                    className="mt-1"
                  >
                    {customer.contract_signed ? 'Unterzeichnet' : 'Nicht unterzeichnet'}
                  </Badge>
                  {customer.contract_signed_at && (
                    <p className="text-[10px] text-sage-500 mt-0.5">
                      {new Date(customer.contract_signed_at).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-sage-500">Vertrags-Mail</p>
                  <Badge
                    variant={
                      customer.contract_email_status === 'sent'
                        ? 'default'
                        : customer.contract_email_status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="mt-1"
                  >
                    {customer.contract_email_status === 'sent'
                      ? 'Versendet'
                      : customer.contract_email_status === 'failed'
                        ? 'Fehlgeschlagen'
                        : 'Kein Status'}
                  </Badge>
                  {customer.contract_email_sent_at && (
                    <p className="text-[10px] text-sage-500 mt-0.5">
                      {new Date(customer.contract_email_sent_at).toLocaleString('de-DE')}
                    </p>
                  )}
                  {customer.contract_email_error && (
                    <p className="text-[10px] text-red-600 mt-0.5">{customer.contract_email_error}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-sage-500">Datenschutz</p>
                  <Badge
                    variant={customer.datenschutz ? 'default' : 'outline'}
                    className="mt-1"
                  >
                    {customer.datenschutz ? 'Zugestimmt' : 'Nicht zugestimmt'}
                  </Badge>
                </div>
              </div>
              {!customer.onboarding_completed && onboardingToken && (
                <div className="mt-4 p-4 bg-sage-50 rounded-lg border border-sage-200">
                  <p className="text-sm font-semibold text-sage-900 mb-2">Onboarding-Link</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={onboardingToken.url}
                      className="flex-1 px-3 py-2 text-sm border border-sage-300 rounded-md bg-white"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(onboardingToken.url)
                        toast({
                          title: 'Kopiert',
                          description: 'Onboarding-Link wurde in die Zwischenablage kopiert',
                        })
                      }}
                    >
                      Kopieren
                    </Button>
                  </div>
                </div>
              )}
              {customer.contract_signed && (
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResendContractEmail}
                    disabled={resendingContractEmail}
                  >
                    {resendingContractEmail ? 'Wird gesendet...' : 'Vertrags-Mail erneut senden'}
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t pt-4 text-xs text-sage-500">
              <p>Erstellt: {new Date(customer.created_at).toLocaleString('de-DE')}</p>
              <p>Aktualisiert: {new Date(customer.updated_at).toLocaleString('de-DE')}</p>
            </div>
          </div>
        </CollapsibleAdminCard>

        {/* Eigenschaften */}
        <PropertyEditor entityType="customer" entityId={customerId} defaultExpanded={false} />

        <TransactionalEmailPanel
          contactId={customerId}
          recipientEmail={customer.email}
          recipientName={[customer.vorname, customer.nachname].filter(Boolean).join(' ') || customer.email}
          defaultExpanded={false}
        />

        <PetManager
          customerId={customerId}
          pets={customer.pets || []}
          onPetsChange={(pets) => setCustomer((prev) => prev ? { ...prev, pets } : prev)}
          defaultExpanded={false}
        />

        <DocumentManager
          customerId={customerId}
          documents={customer.documents || []}
          pets={customer.pets || []}
          onDocumentsChange={(documents) => setCustomer((prev) => prev ? { ...prev, documents } : prev)}
          defaultExpanded={false}
        />

        {/* Individuelle Preise */}
        <CollapsibleAdminCard
          title="Individuelle Preise"
          defaultExpanded={false}
          headerActions={
            <Button
              size="sm"
              onClick={handleSavePrices}
              disabled={savingPrices}
              className="bg-sage-600 hover:bg-sage-700"
            >
              {savingPrices ? 'Wird gespeichert...' : 'Preise speichern'}
            </Button>
          }
        >
          <p className="text-sm text-sage-600">
            Optional Sonderpreis und/oder Rabatt pro Posten. Leere Felder bedeuten Standard- bzw. Gruppenpreis.
          </p>
          <div className="space-y-4 mt-4">
            {defaultPrices.filter(p => p.price_type !== 'text').map((price) => (
              <PriceOverrideEditorRow
                key={price.id}
                catalogPrice={price}
                categoryName={categories.find(c => c.id === price.category_id)?.name || 'Allgemein'}
                form={getCustomerPriceForm(price.id)}
                onChange={(next) => updateCustomerPriceForm(price.id, next)}
                groupOverride={groupPriceOverrides[price.id] ?? null}
              />
            ))}
          </div>
        </CollapsibleAdminCard>

        {/* Gefahrenbereich */}
        <CollapsibleAdminCard
          title={<CardTitle className="text-destructive">Gefahrenbereich</CardTitle>}
          defaultExpanded={false}
          className="border-destructive/40"
        >
          <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Kunde löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Kunde endgültig löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Der Kunde inklusive Buchungen, Tieren, Dokumenten, Notizen, Onboarding-Links und zusätzlichen Eigenschaften wird dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteCustomer} disabled={isDeleting}>
                    {isDeleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </CollapsibleAdminCard>
      </div>

      <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notizen</CardTitle>
            </CardHeader>
            <CardContent>
              <NotesEditor
                notesApiPath={`/api/admin/customers/${customerId}/notes`}
                notes={notes}
                onNotesChange={setNotes}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Buchungen ({bookings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((booking) => {
                      const isPast = new Date(booking.end_date) < new Date()
                      const isCurrent = new Date(booking.start_date) <= new Date() && new Date(booking.end_date) >= new Date()
                      const isFuture = new Date(booking.start_date) > new Date()

                      let statusBadge = ''
                      if (booking.status === 'approved') {
                        statusBadge = 'bg-green-100 text-green-800 border-green-300'
                      } else if (booking.status === 'rejected') {
                        statusBadge = 'bg-red-100 text-red-800 border-red-300'
                      } else {
                        statusBadge = 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      }

                      return (
                        <div
                          key={booking.id}
                          className={`p-3 border border-sage-200 rounded-lg ${isPast ? 'opacity-75' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sage-900">
                                  {booking.pet?.name || 'Unbekannt'}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {booking.service_type === 'hundepension' ? 'Urlaubsbetreuung' :
                                   booking.service_type === 'katzenbetreuung' ? 'Katzenbetreuung' :
                                   booking.service_type === 'tagesbetreuung' ? 'Tagesbetreuung' :
                                   booking.service_type}
                                </Badge>
                                {(isPast || isCurrent || isFuture) && (
                                  <Badge variant="outline" className="text-xs">
                                    {isPast ? 'Vergangen' : isCurrent ? 'Aktuell' : 'Zukünftig'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-sage-600">
                                {new Date(booking.start_date).toLocaleDateString('de-DE')} - {new Date(booking.end_date).toLocaleDateString('de-DE')}
                              </p>
                              {booking.message && (
                                <p className="text-sm text-sage-500 mt-1 line-clamp-1">
                                  {booking.message}
                                </p>
                              )}
                            </div>
                            <Badge className={statusBadge}>
                              {booking.status === 'approved' ? 'Genehmigt' :
                               booking.status === 'rejected' ? 'Abgelehnt' :
                               'Ausstehend'}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-sage-600 text-center py-4">Keine Buchungen vorhanden</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  )
}
