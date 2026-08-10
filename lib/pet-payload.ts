import { normalizeCarePlan, validateCarePlan } from '@/lib/pet-care-plan'
import { applyCarePlanToPetUpdates } from '@/lib/pet-care-plan-change-log'
import { isDog } from '@/lib/pet-vaccination'

const KOMBI_INTERVALL_VALUES = new Set(['jährlich', 'alle_2_jahre'])

const DATE_FIELDS = ['letzte_impfung', 'letzte_impfung_zusatz', 'letzte_stuhlprobe', 'naechste_stuhlprobe'] as const

function normalizeNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizePetPayload<T extends Record<string, unknown>>(payload: T): T {
  const normalized = { ...payload } as Record<string, unknown>

  for (const field of DATE_FIELDS) {
    if (field in normalized) {
      normalized[field] = normalizeNullableString(normalized[field])
    }
  }

  for (const field of ['name', 'tierart', 'rasse', 'farbe', 'wiedererkennungsmerkmal', 'geschlecht', 'futtermenge', 'medikamente', 'besonderheiten', 'intervall_impfung', 'intervall_entwurmung']) {
    if (field in normalized && typeof normalized[field] === 'string') {
      const value = normalized[field] as string
      normalized[field] = field === 'name' ? value.trim() : value.trim() || null
    }
  }

  if ('care_plan' in normalized) {
    normalized.care_plan = normalizeCarePlan(normalized.care_plan)
  }

  return normalized as T
}

export function finalizePetPayloadUpdates(
  updates: Record<string, unknown>,
  existingCarePlan: unknown
): Record<string, unknown> {
  return applyCarePlanToPetUpdates({ ...updates }, existingCarePlan)
}

export function validatePetPayload(payload: Record<string, unknown>): string | null {
  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    const name = typeof payload.name === 'string' ? payload.name.trim() : ''
    if (!name) {
      return 'Name des Tieres ist erforderlich.'
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'tierart')) {
    const tierart = typeof payload.tierart === 'string' ? payload.tierart.trim() : ''
    if (!tierart) {
      return 'Tierart ist erforderlich.'
    }
  }

  const tierart =
    typeof payload.tierart === 'string' ? payload.tierart.trim() : ''
  if (
    Object.prototype.hasOwnProperty.call(payload, 'tierart') &&
    isDog(tierart) &&
    payload.intervall_impfung
  ) {
    const intervall = String(payload.intervall_impfung)
    if (!KOMBI_INTERVALL_VALUES.has(intervall)) {
      return 'Für Hunde ist bei der Kombiimpfung nur jährlich oder alle 2 Jahre erlaubt.'
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'care_plan') && payload.care_plan != null) {
    const carePlanError = validateCarePlan(payload.care_plan)
    if (carePlanError) {
      return carePlanError
    }
  }

  return null
}
