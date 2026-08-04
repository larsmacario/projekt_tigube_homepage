import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdminDbClient } from '@/lib/admin-auth'
import {
  carePlanChangeSummary,
  hasCarePlanChanged,
  hasMeaningfulCarePlan,
  normalizeCarePlan,
  carePlanToLegacyFields,
  type PetCarePlan,
} from '@/lib/pet-care-plan'

export function applyCarePlanToPetUpdates(
  updates: Record<string, unknown>,
  existingCarePlan: unknown
): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(updates, 'care_plan')) {
    return updates
  }

  const normalized = normalizeCarePlan(updates.care_plan)
  updates.care_plan = normalized && hasMeaningfulCarePlan(normalized) ? normalized : null

  if (normalized && hasMeaningfulCarePlan(normalized)) {
    const legacy = carePlanToLegacyFields(normalized)
    updates.futtermenge = legacy.futtermenge
    updates.medikamente = legacy.medikamente
    if (legacy.besonderheiten != null) {
      updates.besonderheiten = legacy.besonderheiten
    }
  }

  if (
    normalized &&
    hasMeaningfulCarePlan(normalized) &&
    hasCarePlanChanged(existingCarePlan, normalized) &&
    !Object.prototype.hasOwnProperty.call(updates, '_skipCarePlanChangeLog')
  ) {
    updates._carePlanChangeMeta = {
      before: normalizeCarePlan(existingCarePlan),
      after: normalized,
    }
  }

  delete updates._skipCarePlanChangeLog
  return updates
}

export async function logCarePlanChange(input: {
  petId: string
  customerId: string
  changedBy: string | null
  before: PetCarePlan | null
  after: PetCarePlan
  client?: SupabaseClient
}): Promise<void> {
  const db = input.client ?? getAdminDbClient()
  const summary = carePlanChangeSummary(input.before, input.after)

  const { error } = await db.from('pet_care_plan_changes').insert({
    pet_id: input.petId,
    customer_id: input.customerId,
    changed_by: input.changedBy,
    summary,
  })

  if (error) {
    console.error('Failed to log care plan change:', error)
  }
}
