'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PetCarePlanPrintView } from '@/components/portal/pet-care-plan-print'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { Pet } from '@/lib/types'

export default function PortalPetCarePlanPrintPage() {
  const params = useParams<{ id: string }>()
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const response = await authenticatedFetch('/api/portal/pets')
        const data = await response.json()
        const found = (data.pets as Pet[] | undefined)?.find((item) => item.id === params.id) ?? null
        setPet(found)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [params.id])

  if (loading) {
    return <p className="p-8 text-center text-sage-600">Lade Pflegeplan…</p>
  }

  if (!pet) {
    return <p className="p-8 text-center text-sage-600">Tier nicht gefunden.</p>
  }

  return (
    <PetCarePlanPrintView
      petName={pet.name}
      carePlan={pet.care_plan}
    />
  )
}
