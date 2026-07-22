import {
  formatPetMissingFieldsList,
  getPetDashboardMissingFields,
  type PetDashboardCompletenessInput,
} from '@/lib/pet-vaccination'

type PetMissingFieldsHintProps = {
  pet: PetDashboardCompletenessInput
  documents: Array<{ pet_id: string | null; document_type: string }>
  className?: string
}

export function PetMissingFieldsHint({
  pet,
  documents,
  className = 'text-sm text-amber-700',
}: PetMissingFieldsHintProps) {
  const missingFields = getPetDashboardMissingFields(pet, documents)
  const label = formatPetMissingFieldsList(pet.name, missingFields)
  if (!label) return null

  return <p className={className}>{label}</p>
}
