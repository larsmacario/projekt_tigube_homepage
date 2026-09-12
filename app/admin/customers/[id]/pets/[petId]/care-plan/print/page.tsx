'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PetCarePlanVersionViewer } from '@/components/admin/pet-care-plan-version-viewer'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { Contact, Pet } from '@/lib/types'

function AdminPetCarePlanPrintContent() {
  const params = useParams<{ id: string; petId: string }>()
  const [pet, setPet] = useState<Pet | null>(null)
  const [customer, setCustomer] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [petsResponse, customerResponse] = await Promise.all([
          authenticatedFetch(`/api/admin/pets?customer_id=${params.id}`, { credentials: 'include' }),
          authenticatedFetch(`/api/admin/customers/${params.id}`, { credentials: 'include' }),
        ])
        const petsData = await petsResponse.json()
        const customerData = await customerResponse.json()
        const found =
          (petsData.pets as Pet[] | undefined)?.find((item) => item.id === params.petId) ?? null
        setPet(found)
        setCustomer(customerData.customer ?? null)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [params.id, params.petId])

  if (loading) {
    return <p className="p-8 text-center text-sage-600">Lade Pflegeplan…</p>
  }

  if (!pet) {
    return <p className="p-8 text-center text-sage-600">Tier nicht gefunden.</p>
  }

  const customerName = customer
    ? `${customer.vorname || ''} ${customer.nachname || ''}`.trim()
    : undefined

  return (
    <PetCarePlanVersionViewer
      petId={pet.id}
      customerId={params.id}
      petName={pet.name}
      customerName={customerName}
      liveCarePlan={pet.care_plan}
    />
  )
}

export default function AdminPetCarePlanPrintPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sage-600">Lade Pflegeplan…</p>}>
      <AdminPetCarePlanPrintContent />
    </Suspense>
  )
}
