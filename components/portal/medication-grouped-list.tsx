import {
  CARE_PLAN_SLOT_LABELS,
  getActiveMedicationEntries,
  groupMedicationsByTimeSlot,
  type PetCarePlan,
} from '@/lib/pet-care-plan'

type MedicationGroupedListProps = {
  plan: PetCarePlan
  className?: string
  itemClassName?: string
}

export function MedicationGroupedList({
  plan,
  className = 'space-y-3',
  itemClassName = 'text-sm text-sage-700',
}: MedicationGroupedListProps) {
  const entries = getActiveMedicationEntries(plan)
  if (entries.length === 0) return null

  const grouped = groupMedicationsByTimeSlot(entries)

  return (
    <div className={className}>
      {CARE_PLAN_SLOT_LABELS.map((label) => {
        const slotEntries = grouped[label]
        if (slotEntries.length === 0) return null

        return (
          <div key={label}>
            <p className="font-medium text-sage-900">{label}</p>
            <ul className={`mt-1 space-y-1 ${itemClassName}`}>
              {slotEntries.map((entry, index) => (
                <li key={`${label}-${index}`}>
                  {entry.timing} · {entry.medication} · {entry.amount}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
