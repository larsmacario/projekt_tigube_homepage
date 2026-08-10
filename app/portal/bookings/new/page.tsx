'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PortalBookingWizard } from '@/components/portal/portal-booking-wizard'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { readApiResponse } from '@/lib/read-api-response'
import type { BookingRequest, Pet } from '@/lib/types'

export default function NewBookingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPets() {
      try {
        const response = await authenticatedFetch('/api/portal/pets')
        const { data, error } = await readApiResponse<{ pets?: Pet[]; error?: string }>(response)
        if (error) throw new Error(error)
        setPets(data?.pets || [])
      } catch (error) {
        console.error('Error loading pets:', error)
        toast({
          title: 'Fehler',
          description: error instanceof Error ? error.message : 'Fehler beim Laden der Tiere',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    void loadPets()
  }, [toast])

  function handleSuccess(_created: BookingRequest[]) {
    router.push('/portal/bookings?created=1')
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sage-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="-ml-2 text-sage-600" asChild>
          <Link href="/portal/bookings">
            <ArrowLeft className="mr-1 size-4" />
            Zurück zu Meine Buchungen
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-sage-900">Neue Buchungsanfrage</h1>
          <p className="mt-2 text-sage-600">
            Tier und Leistung, Zeitraum und optionale Zusatzleistungen
          </p>
        </div>
      </div>

      <PortalBookingWizard
        pets={pets}
        onSuccess={handleSuccess}
        onCancel={() => router.push('/portal/bookings')}
      />
    </div>
  )
}
