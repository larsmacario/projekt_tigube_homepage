'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { PetCarePlanForm } from '@/components/portal/pet-care-plan-form'
import {
  carePlanFromPet,
} from '@/lib/pet-care-plan-form-state'
import {
  isCarePlanComplete,
  normalizeCarePlan,
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

export type PortalBookingCarePlanSectionHandle = {
  saveIncompleteCarePlans: () => Promise<
    { success: true; pets: Pet[] } | { success: false; error: string }
  >
}

function isCarePlanDraftDirty(pet: Pet, draft: PetCarePlan): boolean {
  const saved = normalizeCarePlan(pet.care_plan)
  const current = normalizeCarePlan(draft)
  return JSON.stringify(saved) !== JSON.stringify(current)
}

async function persistCarePlan(petId: string, draft: PetCarePlan): Promise<Pet> {
  const response = await authenticatedFetch(`/api/portal/pets/${petId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ care_plan: draft }),
  })
  const { data, error } = await readApiResponse<{ pet?: Pet; error?: string }>(response)
  if (error || !data?.pet) {
    throw new Error(error || 'Speichern fehlgeschlagen')
  }
  return data.pet
}

export const PortalBookingCarePlanSection = forwardRef<
  PortalBookingCarePlanSectionHandle,
  PortalBookingCarePlanSectionProps
>(function PortalBookingCarePlanSection(
  { selectedPetIds, pets, onPetsUpdated },
  ref
) {
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
      for (const id of Object.keys(next)) {
        if (!selectedPetIds.includes(id)) {
          delete next[id]
        }
      }
      return next
    })
  }, [selectedPets, selectedPetIds])

  async function saveDraftForPet(
    pet: Pet,
    draft: PetCarePlan,
    currentPets: Pet[]
  ): Promise<{ pets: Pet[]; pet: Pet }> {
    const validationError = validateCarePlan(draft)
    if (validationError) {
      throw new Error(validationError)
    }

    const updatedPet = await persistCarePlan(pet.id, draft)
    return {
      pets: currentPets.map((item) => (item.id === pet.id ? updatedPet : item)),
      pet: updatedPet,
    }
  }

  async function saveCarePlanDraft(
    pet: Pet,
    draft: PetCarePlan,
    currentPets: Pet[],
    options?: { silent?: boolean }
  ): Promise<Pet[] | null> {
    if (!isCarePlanDraftDirty(pet, draft) && isCarePlanComplete(pet)) {
      return currentPets
    }

    setSavingPetId(pet.id)
    try {
      const result = await saveDraftForPet(pet, draft, currentPets)
      setDrafts((prev) => ({
        ...prev,
        [pet.id]: carePlanFromPet(result.pet),
      }))
      onPetsUpdated(result.pets)
      if (!options?.silent) {
        toast({ title: 'Gespeichert', description: `Pflegeplan für ${pet.name} aktualisiert.` })
      }
      return result.pets
    } catch (error) {
      toast({
        title: error instanceof Error && error.message.includes('Bitte')
          ? 'Pflegeplan unvollständig'
          : 'Fehler',
        description:
          error instanceof Error ? error.message : 'Pflegeplan konnte nicht gespeichert werden.',
        variant: 'destructive',
      })
      return null
    } finally {
      setSavingPetId(null)
    }
  }

  useImperativeHandle(ref, () => ({
    async saveIncompleteCarePlans() {
      let updatedPets = pets

      for (const pet of selectedPets) {
        const draft = drafts[pet.id] ?? carePlanFromPet(pet)
        const needsSave =
          !isCarePlanComplete(pet) || isCarePlanDraftDirty(pet, draft)

        if (!needsSave) continue

        const validationError = validateCarePlan(draft)
        if (validationError) {
          return {
            success: false as const,
            error: `${pet.name}: ${validationError}`,
          }
        }

        try {
          const result = await saveDraftForPet(pet, draft, updatedPets)
          updatedPets = result.pets
          setDrafts((prev) => ({
            ...prev,
            [pet.id]: carePlanFromPet(result.pet),
          }))
        } catch (error) {
          return {
            success: false as const,
            error:
              error instanceof Error
                ? `${pet.name}: ${error.message}`
                : `Pflegeplan für ${pet.name} konnte nicht gespeichert werden.`,
          }
        }
      }

      if (updatedPets !== pets) {
        onPetsUpdated(updatedPets)
      }

      return { success: true as const, pets: updatedPets }
    },
  }))

  async function saveCarePlan(pet: Pet) {
    const draft = drafts[pet.id]
    if (!draft) return
    await saveCarePlanDraft(pet, draft, pets)
  }

  if (selectedPets.length === 0) return null

  return (
    <div className="space-y-4 rounded-lg border border-sage-200 bg-white p-4">
      <div>
        <h3 className="font-semibold text-sage-900">Futter- & Medikamentenplan</h3>
        <p className="mt-1 text-sm text-sage-600">
          Passe den Plan hier direkt an – Änderungen gelten für alle Buchungen und dein Tierprofil.
        </p>
      </div>

      {selectedPets.map((pet) => {
        const complete = isCarePlanComplete(pet)
        const draft = drafts[pet.id] ?? carePlanFromPet(pet)
        const dirty = isCarePlanDraftDirty(pet, draft)

        return (
          <div key={pet.id} className="space-y-3 rounded-lg border border-sage-100 p-3">
            <p className="font-medium text-sage-900">{pet.name}</p>
            {!complete && (
              <p className="text-sm text-amber-800">
                Der Pflegeplan ist noch unvollständig. Bitte ergänze die Angaben, bevor du fortfährst.
              </p>
            )}
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
              disabled={savingPetId === pet.id || (complete && !dirty)}
            >
              {savingPetId === pet.id
                ? 'Speichern…'
                : dirty || !complete
                  ? 'Pflegeplan speichern'
                  : 'Änderungen speichern'}
            </Button>
          </div>
        )
      })}
    </div>
  )
})

export function selectedPetsHaveCompleteCarePlans(
  petIds: string[],
  pets: Pet[]
): boolean {
  const selected = pets.filter((pet) => petIds.includes(pet.id))
  return selected.length > 0 && selected.every((pet) => isCarePlanComplete(pet))
}
