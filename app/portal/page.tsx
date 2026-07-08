'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { Customer, Pet, Document, BookingRequest } from '@/lib/types'
import { supabase } from '@/lib/supabase'

export default function PortalPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [profileRes, petsRes, docsRes, bookingsRes] = await Promise.all([
        authenticatedFetch('/api/portal/profile'),
        authenticatedFetch('/api/portal/pets'),
        authenticatedFetch('/api/portal/documents'),
        authenticatedFetch('/api/portal/bookings'),
      ])

      const [profileData, petsData, docsData, bookingsData] = await Promise.all([
        profileRes.json(),
        petsRes.json(),
        docsRes.json(),
        bookingsRes.json(),
      ])

      setCustomer(profileData.customer)
      setPets(petsData.pets || [])
      setDocuments(docsData.documents || [])
      setBookings(bookingsData.bookings || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  const showOnboardingBanner = customer && !customer.onboarding_completed
  const isProfileComplete = !!(customer && customer.nachname && customer.vorname && customer.datenschutz && customer.telefonnummer)
  const isStep1Complete = isProfileComplete
  const hasPets = pets.length > 0
  const onboardingLink = !isStep1Complete
    ? '/portal/profile?onboarding=true&step=1'
    : !hasPets
    ? '/portal/profile?onboarding=true&step=2'
    : '/portal/profile?onboarding=true&step=3'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">
          Willkommen{customer?.vorname ? `, ${customer.vorname}` : ''}!
        </h1>
        <p className="mt-2 text-sage-600">Dein persönliches Kundenportal</p>
      </div>

      {/* Onboarding-Hinweis */}
      {showOnboardingBanner && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Onboarding fortsetzen</CardTitle>
            <CardDescription className="text-amber-700">
              Bitte schließe dein Kundenprofil und die Tiererfassung vollständig ab.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={onboardingLink}>
              <Button className="bg-amber-600 hover:bg-amber-700">
                Onboarding fortsetzen
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Übersicht */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mein Profil</CardTitle>
          </CardHeader>
          <CardContent>
            {customer ? (
              <div className="space-y-2 text-sm text-sage-600">
                <p>{customer.vorname} {customer.nachname}</p>
                <p>{customer.email}</p>
                {customer.telefonnummer && <p>{customer.telefonnummer}</p>}
              </div>
            ) : (
              <p className="text-sm text-sage-600">Nicht ausgefüllt</p>
            )}
            <Link href="/portal/profile" className="block mt-4">
              <Button variant="outline" size="sm">Bearbeiten</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buchungsanfragen</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-sage-600">
                  <p className="font-semibold text-sage-900">
                    {bookings.filter(b => b.status === 'pending').length} ausstehend
                  </p>
                  <p>
                    {bookings.filter(b => b.status === 'approved').length} genehmigt
                  </p>
                  <p>
                    {bookings.filter(b => b.status === 'rejected').length} abgelehnt
                  </p>
                </div>
                {bookings.filter(b => b.status === 'pending').length > 0 && (
                  <div className="space-y-1">
                    {bookings
                      .filter(b => b.status === 'pending')
                      .slice(0, 2)
                      .map(booking => (
                        <div key={booking.id} className="text-xs p-2 bg-yellow-50 rounded border border-yellow-200">
                          <p className="font-medium text-sage-900">
                            {booking.pet?.name || 'Unbekannt'}
                          </p>
                          <p className="text-sage-600">
                            {new Date(booking.start_date).toLocaleDateString('de-DE')} - {new Date(booking.end_date).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-sage-600">Keine Buchungsanfragen</p>
            )}
            <Link href="/portal/bookings" className="block mt-4">
              <Button variant="outline" size="sm">
                {bookings.length > 0 ? 'Alle anzeigen' : 'Neue Anfrage'}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meine Tiere</CardTitle>
          </CardHeader>
          <CardContent>
            {pets.length > 0 ? (
              <ul className="space-y-1 text-sm text-sage-600">
                {pets.slice(0, 3).map((pet) => (
                  <li key={pet.id}>{pet.name} ({pet.tierart || 'unbekannt'})</li>
                ))}
                {pets.length > 3 && <li>+ {pets.length - 3} weitere</li>}
              </ul>
            ) : (
              <p className="text-sm text-sage-600">Keine Tiere hinzugefügt</p>
            )}
            <Link href="/portal/pets" className="block mt-4">
              <Button variant="outline" size="sm">
                {pets.length > 0 ? 'Verwalten' : 'Tier hinzufügen'}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dokumente</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length > 0 ? (
              <div className="text-sm text-sage-600">
                <p>{documents.filter(d => d.document_type === 'vertrag').length} Vertrag/Verträge</p>
                <p>{documents.filter(d => d.document_type === 'impfpass').length} Impfpass/Impfpässe</p>
                <p>{documents.filter(d => d.document_type === 'wurmtest').length} Wurmtest(s)</p>
              </div>
            ) : (
              <p className="text-sm text-sage-600">Keine Dokumente hochgeladen</p>
            )}
            <Link href="/portal/documents" className="block mt-4">
              <Button variant="outline" size="sm">
                {documents.length > 0 ? 'Verwalten' : 'Dokument hochladen'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Checkliste */}
      <Card>
        <CardHeader>
          <CardTitle>Deine Checkliste</CardTitle>
          <CardDescription>Diese Schritte solltest du abschließen</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${isProfileComplete ? 'bg-green-500' : 'bg-sage-300'}`}>
                {isProfileComplete ? '✓' : '1'}
              </span>
              <span className={isProfileComplete ? 'text-sage-600 line-through' : 'text-sage-900'}>
                Profil vervollständigen
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${pets.length > 0 ? 'bg-green-500' : 'bg-sage-300'}`}>
                {pets.length > 0 ? '✓' : '2'}
              </span>
              <span className={pets.length > 0 ? 'text-sage-600 line-through' : 'text-sage-900'}>
                Tiere hinzufügen
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${documents.some(d => d.document_type === 'impfpass') ? 'bg-green-500' : 'bg-sage-300'}`}>
                {documents.some(d => d.document_type === 'impfpass') ? '✓' : '3'}
              </span>
              <span className={documents.some(d => d.document_type === 'impfpass') ? 'text-sage-600 line-through' : 'text-sage-900'}>
                Impfpass hochladen
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${documents.some(d => d.document_type === 'wurmtest') ? 'bg-green-500' : 'bg-sage-300'}`}>
                {documents.some(d => d.document_type === 'wurmtest') ? '✓' : '4'}
              </span>
              <span className={documents.some(d => d.document_type === 'wurmtest') ? 'text-sage-600 line-through' : 'text-sage-900'}>
                Wurmtest hochladen
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${documents.some(d => d.document_type === 'vertrag') ? 'bg-green-500' : 'bg-sage-300'}`}>
                {documents.some(d => d.document_type === 'vertrag') ? '✓' : '5'}
              </span>
              <span className={documents.some(d => d.document_type === 'vertrag') ? 'text-sage-600 line-through' : 'text-sage-900'}>
                Pflegevertrag unterzeichnen
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Checkliste für Hundeurlaub */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-sage-900">CHECKLISTE</CardTitle>
          <CardDescription className="text-lg font-semibold text-sage-800">
            für den Hundeurlaub in der Pension
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Für den Aufenthalt mitbringen */}
          <div>
            <h3 className="font-semibold text-sage-900 mb-3">für den Aufenthalt mitbringen</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <Checkbox id="check-1" className="mt-1" />
                <label htmlFor="check-1" className="text-sage-700 cursor-pointer">
                  Leine - Halsband - Geschirr
                </label>
              </li>
              <li className="flex items-start gap-3">
                <Checkbox id="check-2" className="mt-1" />
                <label htmlFor="check-2" className="text-sage-700 cursor-pointer">
                  Steuermarke
                </label>
              </li>
              <li className="flex items-start gap-3">
                <Checkbox id="check-3" className="mt-1" />
                <label htmlFor="check-3" className="text-sage-700 cursor-pointer">
                  Fressnapf - Wassernapf
                </label>
              </li>
              <li className="flex items-start gap-3">
                <Checkbox id="check-4" className="mt-1" />
                <label htmlFor="check-4" className="text-sage-700 cursor-pointer">
                  Futter - Leckerlis
                </label>
              </li>
              <li className="flex items-start gap-3">
                <Checkbox id="check-5" className="mt-1" />
                <label htmlFor="check-5" className="text-sage-700 cursor-pointer">
                  Bettchen - Kissen - Kuscheldecke - Box/Hundezelt
                </label>
              </li>
              <li className="flex items-start gap-3">
                <Checkbox id="check-6" className="mt-1" />
                <label htmlFor="check-6" className="text-sage-700 cursor-pointer">
                  Medikamente - Nahrungsergänzung inkl. Verabreichungsplan
                </label>
              </li>
              <li className="flex items-start gap-3">
                <Checkbox id="check-7" className="mt-1" />
                <label htmlFor="check-7" className="text-sage-700 cursor-pointer">
                  Kopie der aktuellen Hundehalter-Haftpflicht
                </label>
              </li>
            </ul>
          </div>

          {/* ACHTUNG Abschnitt */}
          <div className="border-t pt-6">
            <h3 className="font-bold text-sage-900 mb-3">ACHTUNG:</h3>
            <div className="space-y-3 text-sage-700">
              <p>
                Erneuere rechtzeitig den benötigten Impfschutz, sorge für eine Entwurmung oder eine Kotuntersuchung und führe eine Ungeziefer-Prävention durch, um deinen Hund maximal zu schützen.
              </p>
              <p>
                Stelle unbedingt sicher, dass Dritte in der Hundehalter-Haftpflicht mit inbegriffen sind.
              </p>
              <p>
                Fress- und Wassernapf sowie ein Bettchen mit Kuscheldecke stellen wir auf Wunsch selbstverständlich zur Verfügung. Dennoch macht es durchaus Sinn, die gewohnten Sachen von zu Hause in den Urlaub mitzugeben, um etwas Vertrautes in der neuen Umgebung dabei zu haben.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wichtige Infos */}
      <Card>
        <CardHeader>
          <CardTitle>Die wichtigsten Infos auf einen Blick</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bring- und Holzeiten */}
          <div>
            <h3 className="text-lg font-semibold text-sage-900 mb-3">Unsere Bring- und Holzeiten</h3>
            <div className="space-y-2 text-sage-700">
              <div>
                <p className="font-medium">Montag - Freitag</p>
                <p>7-8h / 12-14h (mit Termin) / 17-18h</p>
              </div>
              <div>
                <p className="font-medium">Samstag, Sonntag, Feiertag</p>
                <p>9-10h / 17-18h</p>
              </div>
              <p className="text-sm text-sage-600 mt-2">
                Außerhalb der offiziellen Zeiten nur mit Termin und gegen Aufpreis.
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-sage-900 mb-3">
              Nötige Unterlagen für den Hundeurlaub und die Tagesbetreuung
            </h3>
            <p className="text-sage-700 mb-4">
              Diese Unterlagen sind zwingend notwendig für den Aufenthalt in unserer Pension. Bitte
              überprüfe rechtzeitig vor dem Urlaubsantritt, ob sie auf dem aktuellen Stand sind.
              Ohne gültige Nachweise kann keine Betreuung stattfinden.
            </p>
            <ul className="space-y-3 text-sage-700">
              <li className="flex items-start gap-2">
                <span className="text-sage-600 mt-1">•</span>
                <div>
                  <p className="font-medium">Impfpass mit den jährlichen Impfungen</p>
                  <p className="text-sm text-sage-600">
                    Parvovirose, Leptospirose, Hepatitis, Staupe, Zwingerhusten, (Tollwut optional)
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sage-600 mt-1">•</span>
                <div>
                  <p className="font-medium">Entwurmung/Kot-Test</p>
                  <p className="text-sm text-sage-600">
                    Wurmkur mit Nachweis vom Tierarzt (den Nachweis bitte im Impfpass vermerken lassen) bzw.
                    Kot-Test beim Check-In. Am Besten ganz frisch, jedoch nicht älter als 3 Monate.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sage-600 mt-1">•</span>
                <p className="text-sm text-sage-600">
                  Bitte sorge im eigenen Interesse für einen ausreichenden Schutz gegen Parasiten wie
                  Zecken und Flöhe.
                </p>
              </li>
            </ul>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-sage-900 mb-3">Stornierung</h3>
            <div className="space-y-3 text-sage-700">
              <div>
                <p className="font-medium">15 Tage und mehr vor Check-In:</p>
                <p className="text-sage-600">kostenlos</p>
              </div>
              <div>
                <p className="font-medium">14 - 7 Tage vor Check-In:</p>
                <p className="text-sage-600">50% der Buchungssumme</p>
              </div>
              <div>
                <p className="font-medium">6 Tage und weniger vor Check-In:</p>
                <p className="text-sage-600">100% der Buchungssumme</p>
              </div>
              <div className="mt-4 space-y-2 text-sm text-sage-600">
                <p>
                  Absagen werden jeweils bis 18h berücksichtigt - auch dann, wenn sie an einem Sonn-/Feiertag
                  oder in unserem Urlaub getätigt werden. Die Stornierung muss grundsätzlich in schriftlicher
                  Form per Mail oder WhatsApp erfolgen.
                </p>
                <p>
                  Bei frühzeitiger Abholung gibt es keine Rückerstattung der gebuchten Tage. Dies gilt auch, wenn
                  ein Hund später als zum vereinbarten Datum in Betreuung gebracht wird.
                </p>
                <p>
                  Tagesgäste müssen spätestens bis Mittwochabend ihren nicht benötigten Platz für die
                  kommende Woche absagen, damit wir am Donnerstag unseren Springern den Platz anbieten
                  können. Wird der Platz später abgesagt, gelten die o.g. Stornobedingungen.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

