'use client'

import Link from 'next/link'
import {
  CARE_PLAN_FOOD_TYPES,
  CARE_PLAN_SLOT_LABELS,
  formatCarePlanSummary,
  normalizeCarePlan,
  type PetCarePlan,
} from '@/lib/pet-care-plan'
import type { Pet } from '@/lib/types'

type PetCarePlanSummaryProps = {
  pet: Pick<Pet, 'name' | 'care_plan'>
  editHref?: string
  printHref?: string
  compact?: boolean
}

export function PetCarePlanSummary({
  pet,
  editHref,
  printHref,
  compact = false,
}: PetCarePlanSummaryProps) {
  const plan = normalizeCarePlan(pet.care_plan)
  if (!plan) return null

  const foodTypes = plan.foodTypes
    .map((id) => CARE_PLAN_FOOD_TYPES.find((item) => item.id === id)?.label)
    .filter(Boolean)
    .join(', ')

  if (compact) {
    return (
      <div className="rounded-lg border border-sage-200 bg-sage-50/40 p-4 space-y-2">
        <p className="text-sm font-medium text-sage-900">Pflegeplan für {pet.name}</p>
        <p className="text-sm text-sage-700 whitespace-pre-line">{formatCarePlanSummary(plan)}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          {editHref && (
            <Link href={editHref} className="text-sm text-primary hover:underline" target="_blank">
              Plan bearbeiten
            </Link>
          )}
          {printHref && (
            <Link href={printHref} className="text-sm text-primary hover:underline" target="_blank">
              Druckversion
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-sage-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="font-semibold text-sage-900">Pflegeplan – {pet.name}</h4>
        <div className="flex flex-wrap gap-3">
          {editHref && (
            <Link href={editHref} className="text-sm text-primary hover:underline" target="_blank">
              Bearbeiten
            </Link>
          )}
          {printHref && (
            <Link href={printHref} className="text-sm text-primary hover:underline" target="_blank">
              Drucken
            </Link>
          )}
        </div>
      </div>

      {foodTypes && (
        <p className="text-sm text-sage-700">
          <span className="font-medium">Futterarten:</span> {foodTypes}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-sage-200">
          <thead className="bg-sage-50">
            <tr>
              <th className="px-3 py-2 text-left">Fütterung</th>
              {CARE_PLAN_SLOT_LABELS.map((label) => (
                <th key={label} className="px-3 py-2 text-left">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Uhrzeit', key: 'time' as const },
              { label: 'Futter', key: 'food' as const },
              { label: 'Menge', key: 'amount' as const },
            ].map((row) => (
              <tr key={row.key} className="border-t border-sage-100">
                <td className="px-3 py-2 font-medium text-sage-600">{row.label}</td>
                {plan.feeding.map((slot, index) => (
                  <td key={`${row.key}-${index}`} className="px-3 py-2">
                    {slot.enabled ? slot[row.key] || '–' : '–'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plan.medication.some((slot) => slot.enabled) && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-sage-200">
            <thead className="bg-sage-50">
              <tr>
                <th className="px-3 py-2 text-left">Medikamente</th>
                {CARE_PLAN_SLOT_LABELS.map((label) => (
                  <th key={label} className="px-3 py-2 text-left">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Timing', key: 'timing' as const },
                { label: 'Medikament', key: 'medication' as const },
                { label: 'Menge', key: 'amount' as const },
              ].map((row) => (
                <tr key={row.key} className="border-t border-sage-100">
                  <td className="px-3 py-2 font-medium text-sage-600">{row.label}</td>
                  {plan.medication.map((slot, index) => (
                    <td key={`${row.key}-${index}`} className="px-3 py-2">
                      {slot.enabled ? slot[row.key] || '–' : '–'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(plan.intolerances || plan.individualWishes) && (
        <div className="text-sm text-sage-700 space-y-1">
          {plan.intolerances && <p><span className="font-medium">Unverträglichkeiten:</span> {plan.intolerances}</p>}
          {plan.individualWishes && <p><span className="font-medium">Individuelle Wünsche:</span> {plan.individualWishes}</p>}
        </div>
      )}
    </div>
  )
}

export function getCarePlanFromPet(pet: Pick<Pet, 'care_plan'>): PetCarePlan | null {
  return normalizeCarePlan(pet.care_plan)
}
