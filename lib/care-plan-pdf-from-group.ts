import type { PetCarePlanChangeGroup } from '@/lib/types'
import type { PetCarePlanPdfInput } from '@/lib/pet-care-plan-pdf'

function customerDisplayName(
  customer: PetCarePlanChangeGroup['customer']
): string | undefined {
  if (!customer) return undefined
  const name = `${customer.vorname || ''} ${customer.nachname || ''}`.trim()
  return name || customer.email || undefined
}

export function pdfInputFromChangeGroup(
  group: PetCarePlanChangeGroup,
  changeId?: string | null
): PetCarePlanPdfInput {
  const targetChange =
    (changeId ? group.changes.find((change) => change.id === changeId) : null) ??
    group.changes.find((change) => change.id === group.current_change_id) ??
    group.changes[0]

  const customerName = customerDisplayName(group.customer)

  if (!targetChange) {
    return {
      petName: group.pet?.name || 'Tier',
      customerName,
    }
  }

  return {
    petName: group.pet?.name || 'Tier',
    customerName,
    carePlan: targetChange.care_plan_snapshot ?? undefined,
    standDate: targetChange.changed_at,
    summary: targetChange.summary,
  }
}

export function pdfInputFromVersion(input: {
  petName: string
  customerName?: string
  carePlanSnapshot?: unknown | null
  changedAt: string
  summary: string
}): PetCarePlanPdfInput {
  return {
    petName: input.petName,
    customerName: input.customerName,
    carePlan: input.carePlanSnapshot ?? undefined,
    standDate: input.changedAt,
    summary: input.summary,
  }
}
