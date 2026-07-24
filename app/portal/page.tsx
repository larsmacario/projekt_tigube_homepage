'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { Customer, Pet, Document, BookingRequest } from '@/lib/types'
import { PetAvatar } from '@/components/pet-avatar'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { getPetsWithDashboardMissingFields } from '@/lib/pet-vaccination'
import {
  defaultKundenportalData,
  mergeKundenportalData,
  type KundenportalData,
} from '@/lib/cms/portal-defaults'
import { isCustomerProfileComplete } from '@/lib/customer-profile-complete'

export default function PortalPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [portalCms, setPortalCms] = useState<KundenportalData>(defaultKundenportalData)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [profileRes, petsRes, docsRes, bookingsRes, cmsRes] = await Promise.all([
        authenticatedFetch('/api/portal/profile'),
        authenticatedFetch('/api/portal/pets'),
        authenticatedFetch('/api/portal/documents'),
        authenticatedFetch('/api/portal/bookings'),
        fetch('/api/cms?key=kundenportal'),
      ])

      const [profileData, petsData, docsData, bookingsData, cmsJson] = await Promise.all([
        profileRes.json(),
        petsRes.json(),
        docsRes.json(),
        bookingsRes.json(),
        cmsRes.json(),
      ])

      setCustomer(profileData.customer)
      setPets(petsData.pets || [])
      setDocuments(docsData.documents || [])
      setBookings(bookingsData.bookings || [])
      setPortalCms(mergeKundenportalData(cmsJson.data as KundenportalData | null))
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
  const isProfileComplete = isCustomerProfileComplete(customer)
  const isStep1Complete = isProfileComplete
  const showAddressBackfillBanner =
    !!customer && customer.onboarding_completed && !isProfileComplete
  const hasPets = pets.length > 0
  const onboardingLink = !isStep1Complete
    ? '/portal/profile?onboarding=true&step=1'
    : !hasPets
    ? '/portal/profile?onboarding=true&step=2'
    : '/portal/profile?onboarding=true&step=3'

  const petsWithMissingFields = getPetsWithDashboardMissingFields(pets, documents)
  const hasCompletePetData = pets.length === 0 || petsWithMissingFields.length === 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">
          Willkommen{customer?.vorname ? `, ${customer.vorname}` : ''}!
        </h1>
        <p className="mt-2 text-sage-600">Dein persönliches Kundenportal</p>
      </div>

      {petsWithMissingFields.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Tierdaten ergänzen</CardTitle>
            <CardDescription className="text-amber-700">
              Bitte ergänze die fehlenden Angaben rechtzeitig vor dem nächsten Aufenthalt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {petsWithMissingFields.map(({ pet, missingFields }) => (
                <li key={pet.id} className="text-sm text-amber-800">
                  <span className="font-semibold">{pet.name}:</span>{' '}
                  {missingFields.join(', ')}
                </li>
              ))}
            </ul>
            <Link href="/portal/pets">
              <Button className="bg-amber-600 hover:bg-amber-700">
                Tierdaten nachtragen
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {showAddressBackfillBanner && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Adresse ergänzen</CardTitle>
            <CardDescription className="text-amber-700">
              Bitte hinterlege deine Anschrift in deinem Profil – sie wird auch im Betreuungsvertrag geführt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/portal/profile">
              <Button className="bg-amber-600 hover:bg-amber-700">Zum Profil</Button>
            </Link>
          </CardContent>
        </Card>
      )}

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
              <ul className="space-y-2 text-sm text-sage-600">
                {pets.slice(0, 3).map((pet) => (
                  <li key={pet.id} className="flex items-center gap-2">
                    <PetAvatar name={pet.name} photoUrl={pet.primary_photo_url} size="sm" />
                    <span>{pet.name} ({pet.tierart || 'unbekannt'})</span>
                  </li>
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

      {/* Checklisten */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              {hasPets && (
                <li className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${hasCompletePetData ? 'bg-green-500' : 'bg-sage-300'}`}>
                    {hasCompletePetData ? '✓' : '3'}
                  </span>
                  <span className={hasCompletePetData ? 'text-sage-600 line-through' : 'text-sage-900'}>
                    Tierdaten ergänzen (Impfpass, Wurmtest, Entwurmung)
                  </span>
                </li>
              )}
              <li className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${documents.some(d => d.document_type === 'vertrag') ? 'bg-green-500' : 'bg-sage-300'}`}>
                  {documents.some(d => d.document_type === 'vertrag') ? '✓' : '4'}
                </span>
                <span className={documents.some(d => d.document_type === 'vertrag') ? 'text-sage-600 line-through' : 'text-sage-900'}>
                  Betreuungsvertrag unterzeichnen
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Checkliste für Hundeurlaub */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sage-900">{portalCms.checklistTitle}</CardTitle>
            <CardDescription className="text-lg font-semibold text-sage-800">
              {portalCms.checklistSubtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-sage-900 mb-3">{portalCms.checklistSectionTitle}</h3>
              <ul className="space-y-2">
                {(portalCms.checklistItems ?? []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Checkbox id={`check-${idx}`} className="mt-1" />
                    <label htmlFor={`check-${idx}`} className="text-sage-700 cursor-pointer">
                      {item}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-bold text-sage-900 mb-3">{portalCms.checklistWarningTitle}</h3>
              <div className="space-y-3 text-sage-700">
                {(portalCms.checklistWarningNotes ?? []).map((note, idx) => (
                  <p key={idx}>{note}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Wichtige Infos */}
      <Card>
        <CardHeader>
          <CardTitle>{portalCms.infosTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-sage-900 mb-3">{portalCms.pickupTimesTitle}</h3>
            <div className="space-y-2 text-sage-700">
              {(portalCms.pickupTimesList ?? []).map((row, idx) => (
                <div key={idx}>
                  <p className="font-medium">{row.days}</p>
                  <p>{row.times}</p>
                </div>
              ))}
              {portalCms.pickupTimesNote ? (
                <p className="text-sm text-sage-600 mt-2">{portalCms.pickupTimesNote}</p>
              ) : null}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-sage-900 mb-3">{portalCms.documentsTitle}</h3>
            <p className="text-sage-700 mb-4">{portalCms.documentsIntro}</p>
            <ul className="space-y-3 text-sage-700">
              {(portalCms.documentsItems ?? []).map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-sage-600 mt-1">•</span>
                  <div>
                    {doc.title ? <p className="font-medium">{doc.title}</p> : null}
                    {doc.description ? (
                      <p className={doc.title ? 'text-sm text-sage-600' : 'text-sm text-sage-600'}>
                        {doc.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-sage-900 mb-3">{portalCms.cancellationTitle}</h3>
            <div className="space-y-3 text-sage-700">
              {(portalCms.cancellationPolicy ?? []).map((rule, idx) => (
                <div key={idx}>
                  <p className="font-medium">{rule.period}</p>
                  <p className="text-sage-600">{rule.refund}</p>
                </div>
              ))}
              <div className="mt-4 space-y-2 text-sm text-sage-600">
                {(portalCms.cancellationNotes ?? []).map((note, idx) => (
                  <p key={idx}>{note}</p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

