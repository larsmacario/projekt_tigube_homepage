'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { readApiResponse } from '@/lib/read-api-response'
import { formatSelectedDatesDE } from '@/lib/day-care-booking'
import type { SpringerOffer } from '@/lib/types'

export default function PortalSpringerOfferPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token
  const router = useRouter()
  const { toast } = useToast()
  const [offer, setOffer] = useState<SpringerOffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    void loadOffer()
  }, [token])

  async function loadOffer() {
    setLoading(true)
    setError(null)
    try {
      const response = await authenticatedFetch(`/api/portal/springer/offers/${token}`)
      const { data, error: apiError } = await readApiResponse<{
        offer?: SpringerOffer
        error?: string
      }>(response)

      if (apiError || !data?.offer) {
        setError(apiError || 'Angebot nicht gefunden')
        setOffer(null)
        return
      }

      setOffer(data.offer)
    } catch (err) {
      console.error(err)
      setError('Angebot konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }

  async function acceptOffer() {
    if (!token || !offer) return
    setAccepting(true)
    try {
      const response = await authenticatedFetch(
        `/api/portal/springer/offers/${token}/accept`,
        { method: 'POST' }
      )
      const { data, error: apiError } = await readApiResponse<{
        booking?: { id: string }
        error?: string
      }>(response)

      if (apiError || !data?.booking) {
        throw new Error(apiError || 'Annahme fehlgeschlagen')
      }

      toast({
        title: 'Platz angenommen',
        description: 'Deine Buchungsanfrage wurde erstellt und wartet auf Freigabe.',
      })
      router.push('/portal/bookings?from=springer')
    } catch (err) {
      console.error(err)
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Annahme fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-sage-600" />
      </div>
    )
  }

  if (error || !offer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sage-900">Angebot nicht verfügbar</CardTitle>
          <CardDescription>{error || 'Dieses Angebot wurde nicht gefunden.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => router.push('/portal/springer')}>
            Zur Springerliste
          </Button>
        </CardContent>
      </Card>
    )
  }

  const alreadyResponded = offer.status === 'responded'
  const petName = offer.pet?.name || 'dein Tier'
  const dateLabel = formatSelectedDatesDE([offer.offer_date])

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">Freier Tagesbetreuungsplatz</h1>
        <p className="mt-2 text-sage-600">
          Hier kannst du den angebotenen Platz für {petName} annehmen.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sage-900">{petName}</CardTitle>
          <CardDescription>Tagesbetreuung am {dateLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alreadyResponded ? (
            <p className="text-sage-700">
              Du hast dieses Angebot bereits angenommen. Die Buchungsanfrage findest du unter
              Buchungen.
            </p>
          ) : (
            <p className="text-sage-700">
              Mit der Annahme erstellen wir eine ausstehende Buchungsanfrage für die
              Tagesbetreuung. Wir melden uns nach der Prüfung.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {!alreadyResponded && (
              <Button
                className="bg-sage-600 hover:bg-sage-700"
                disabled={accepting}
                onClick={() => void acceptOffer()}
              >
                {accepting ? 'Wird angenommen…' : 'Platz annehmen'}
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push('/portal/bookings')}>
              Zu den Buchungen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
