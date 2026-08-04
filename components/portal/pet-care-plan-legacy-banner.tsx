'use client'

import { petHasLegacyCareText, hasStoredCarePlan } from '@/lib/pet-care-plan'
import type { Pet } from '@/lib/types'

type PetCarePlanLegacyBannerProps = {
  pet: Pick<Pet, 'futtermenge' | 'medikamente' | 'besonderheiten' | 'care_plan'>
}

export function PetCarePlanLegacyBanner({ pet }: PetCarePlanLegacyBannerProps) {
  if (hasStoredCarePlan(pet) || !petHasLegacyCareText(pet)) {
    return null
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
      <p className="text-sm font-medium text-amber-900">
        Bitte übertrage die bisherigen Angaben in den neuen Pflegeplan.
      </p>
      {pet.futtermenge && (
        <div>
          <p className="text-xs font-semibold text-amber-800">Bisherige Futtermenge</p>
          <p className="text-sm text-amber-900 whitespace-pre-line">{pet.futtermenge}</p>
        </div>
      )}
      {pet.medikamente && (
        <div>
          <p className="text-xs font-semibold text-amber-800">Bisherige Medikamente</p>
          <p className="text-sm text-amber-900 whitespace-pre-line">{pet.medikamente}</p>
        </div>
      )}
      {pet.besonderheiten && (
        <div>
          <p className="text-xs font-semibold text-amber-800">Bisherige Besonderheiten</p>
          <p className="text-sm text-amber-900 whitespace-pre-line">{pet.besonderheiten}</p>
        </div>
      )}
    </div>
  )
}
