import type { PetCarePlanChange } from '@/lib/types'

type CarePlanChangeRow = {
  id: string
  pet_id: string
  customer_id: string
  changed_at: string
  changed_by: string | null
  summary: string
  seen_at: string | null
  care_plan_snapshot?: unknown | null
  archived_at?: string | null
  pets?: { id: string; name: string } | { id: string; name: string }[] | null
  contacts?:
    | { id: string; vorname: string | null; nachname: string | null; email: string | null }
    | Array<{ id: string; vorname: string | null; nachname: string | null; email: string | null }>
    | null
}

export function mapCarePlanChangeRow(row: CarePlanChangeRow): PetCarePlanChange {
  const pets = row.pets
  const contacts = row.contacts

  return {
    id: row.id,
    pet_id: row.pet_id,
    customer_id: row.customer_id,
    changed_at: row.changed_at,
    changed_by: row.changed_by,
    summary: row.summary,
    seen_at: row.seen_at,
    care_plan_snapshot: row.care_plan_snapshot ?? null,
    archived_at: row.archived_at ?? null,
    pet: Array.isArray(pets) ? pets[0] ?? null : pets ?? null,
    customer: Array.isArray(contacts) ? contacts[0] ?? null : contacts ?? null,
  }
}

export const CARE_PLAN_CHANGE_SELECT = `
  id,
  pet_id,
  customer_id,
  changed_at,
  changed_by,
  summary,
  seen_at,
  care_plan_snapshot,
  archived_at,
  pets:pet_id ( id, name ),
  contacts:customer_id ( id, vorname, nachname, email )
`
