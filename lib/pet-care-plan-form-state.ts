import { emptyPetCarePlan, normalizeCarePlan, type PetCarePlan } from '@/lib/pet-care-plan'
import type { Pet } from '@/lib/types'

export function carePlanFromPet(pet?: Pick<Pet, 'care_plan'> | null): PetCarePlan {
  return normalizeCarePlan(pet?.care_plan) ?? emptyPetCarePlan()
}

export function buildPetSaveBody(
  formData: Record<string, unknown>,
  carePlan: PetCarePlan
): Record<string, unknown> {
  return {
    ...formData,
    care_plan: carePlan,
  }
}
