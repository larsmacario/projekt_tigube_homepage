'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { PetCarePlanForm } from '@/components/portal/pet-care-plan-form'
import { PetCarePlanSummary } from '@/components/portal/pet-care-plan-summary'
import {
  carePlanFromPet,
} from '@/lib/pet-care-plan-form-state'
import {
  isCarePlanComplete,
  validateCarePlan,
  type PetCarePlan,
} from '@/lib/pet-care-plan'
import { readApiResponse } from '@/lib/read-api-response'
import type { Pet } from '@/lib/types'

type PortalBookingCarePlanSectionProps = {
  selectedPetIds: string[]
  pets: Pet[]
  onPetsUpdated: (pets: Pet[]) => void
}

export function PortalBookingCarePlanSection({
  selectedPetIds,
  pets,
  onPetsUpdated,
}: PortalBookingCarePlanSectionProps) {
  const { toast } = useToast()
  const selectedPets = useMemo(
    () => pets.filter((pet) => selectedPetIds.includes(pet.id)),
    [pets, selectedPetIds]
  )

  const [drafts, setDrafts] = useState<Record<string, PetCarePlan>>({})
  const [savingPetId, setSavingPetId] = useState<string | null>(null)

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const pet of selectedPets) {
        if (!next[pet.id]) {
          next[pet.id] = carePlanFromPet(pet)
        }
      }
      return next
    })
  }, [selectedPets])

  async function saveCarePlan(pet: Pet) {
    const draft = drafts[pet.id]
    if (!draft) return

    const validationError = validateCarePlan(draft)
    if (validationError) {
      toast({
        title: 'Pflegeplan unvollständig',
        description: validationError,
        variant: 'destructive',
      })
      return
    }

    setSavingPetId(pet.id)
    try {
      const response = await authenticatedFetch(`/api/portal/pets/${pet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ care_plan: draft }),
      })
      const { data, error } = await readApiResponse<{ pet?: Pet; error?: string }>(response)
      if (error || !data?.pet) {
        throw new Error(error || 'Speichern fehlgeschlagen')
      }
      onPetsUpdated(pets.map((item) => (item.id === pet.id ? data.pet! : item)))
      toast({ title: 'Gespeichert', description: `Pflegeplan für ${pet.name} aktualisiert.` })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Pflegeplan konnte nicht gespeichert werden.',
        variant: 'destructive',
      })
    } finally {
      setSavingPetId(null)
    }
  }

  if (selectedPets.length === 0) return null

  return (
    <div className="space-y-4 rounded-lg border border-sage-200 bg-white p-4">
      <div>
        <h3 className="font-semibold text-sage-900">Futter- & Medikamentenplan</h3>
        <p className="mt-1 text-sm text-sage-600">
          Dein Pflegeplan wurde aus deinen Tierdaten übernommen. Bitte prüfe, ob sich etwas geändert hat.
        </p>
      </div>

      {selectedPets.map((pet) => {
        const complete = isCarePlanComplete(pet)
        const draft = drafts[pet.id] ?? carePlanFromPet(pet)

        return (
          <div key={pet.id} className="space-y-3 rounded-lg border border-sage-100 p-3">
            <p className="font-medium text-sage-900">{pet.name}</p>
            {complete ? (
              <PetCarePlanSummary
                pet={pet}
                compact
                editHref="/portal/pets"
                printHref={`/portal/pets/${pet.id}/care-plan/print`}
              />
            ) : (
              <>
                <p className="text-sm text-amber-800">
                  Der Pflegeplan ist noch unvollständig. Bitte ergänze die Angaben, bevor du fortfährst.
                </p>
                <PetCarePlanForm
                  value={draft}
                  onChange={(value) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [pet.id]: value,
                    }))
                  }
                  idPrefix={`booking-${pet.id}`}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveCarePlan(pet)}
                  disabled={savingPetId === pet.id}
                >
                  {savingPetId === pet.id ? 'Speichern…' : 'Pflegeplan speichern'}
                </Button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function selectedPetsHaveCompleteCarePlans(
  petIds: string[],
  pets: Pet[]
): boolean {
  const selected = pets.filter((pet) => petIds.includes(pet.id))
  return selected.length > 0 && selected.every((pet) => isCarePlanComplete(pet))
}
