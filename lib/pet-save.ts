import type { SupabaseClient } from '@supabase/supabase-js'
import { finalizePetPayloadUpdates } from '@/lib/pet-payload'
import { logCarePlanChange } from '@/lib/pet-care-plan-change-log'
import type { PetCarePlan } from '@/lib/pet-care-plan'

type CarePlanChangeMeta = {
  before: PetCarePlan | null
  after: PetCarePlan
}

export async function preparePetWritePayload(
  rawUpdates: Record<string, unknown>,
  existingPet: { care_plan: unknown } | null
): Promise<Record<string, unknown>> {
  const updates = finalizePetPayloadUpdates(rawUpdates, existingPet?.care_plan ?? null)
  delete updates._carePlanChangeMeta
  return updates
}

export function extractCarePlanChangeMeta(
  rawUpdates: Record<string, unknown>,
  existingPet: { care_plan: unknown } | null
): CarePlanChangeMeta | null {
  const prepared = finalizePetPayloadUpdates({ ...rawUpdates }, existingPet?.care_plan ?? null)
  const meta = prepared._carePlanChangeMeta
  if (!meta || typeof meta !== 'object') return null
  return meta as CarePlanChangeMeta
}

export async function afterPetCarePlanSaved(input: {
  petId: string
  customerId: string
  changedBy: string | null
  changeMeta: CarePlanChangeMeta | null
  client?: SupabaseClient
}): Promise<void> {
  if (!input.changeMeta) return
  await logCarePlanChange({
    petId: input.petId,
    customerId: input.customerId,
    changedBy: input.changedBy,
    before: input.changeMeta.before,
    after: input.changeMeta.after,
    client: input.client,
  })
}
