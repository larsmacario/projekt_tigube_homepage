import type { Pet } from '@/lib/types'

export const CARE_PLAN_FOOD_TYPES = [
  { id: 'dose', label: 'Dose' },
  { id: 'trocken', label: 'Trockenfutter' },
  { id: 'barf', label: 'BARF' },
  { id: 'gekocht', label: 'Gekocht' },
  { id: 'gemischt', label: 'Gemischt' },
] as const

export type CarePlanFoodTypeId = (typeof CARE_PLAN_FOOD_TYPES)[number]['id']

export const CARE_PLAN_SLOT_LABELS = ['Morgens', 'Mittags', 'Abends'] as const

export type CarePlanSlotLabel = (typeof CARE_PLAN_SLOT_LABELS)[number]

export interface CarePlanFeedingSlot {
  enabled: boolean
  time: string
  food: string
  amount: string
  additive: string
  additiveAmount: string
}

export interface CarePlanMedicationSlot {
  enabled: boolean
  timing: string
  medication: string
  amount: string
}

export interface PetCarePlan {
  foodTypes: CarePlanFoodTypeId[]
  intolerances: string
  individualWishes: string
  feeding: CarePlanFeedingSlot[]
  medication: CarePlanMedicationSlot[]
}

export type PetCarePlanInput = PetCarePlan | Record<string, unknown> | null | undefined

const EMPTY_FEEDING_SLOT = (): CarePlanFeedingSlot => ({
  enabled: false,
  time: '',
  food: '',
  amount: '',
  additive: '',
  additiveAmount: '',
})

const EMPTY_MEDICATION_SLOT = (): CarePlanMedicationSlot => ({
  enabled: false,
  timing: '',
  medication: '',
  amount: '',
})

export function emptyPetCarePlan(): PetCarePlan {
  return {
    foodTypes: [],
    intolerances: '',
    individualWishes: '',
    feeding: CARE_PLAN_SLOT_LABELS.map(() => EMPTY_FEEDING_SLOT()),
    medication: CARE_PLAN_SLOT_LABELS.map(() => EMPTY_MEDICATION_SLOT()),
  }
}

function normalizeString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeFoodTypes(value: unknown): CarePlanFoodTypeId[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set(CARE_PLAN_FOOD_TYPES.map((item) => item.id))
  return value.filter(
    (item): item is CarePlanFoodTypeId =>
      typeof item === 'string' && allowed.has(item as CarePlanFoodTypeId)
  )
}

function normalizeFeedingSlot(value: unknown): CarePlanFeedingSlot {
  const slot = (value && typeof value === 'object' ? value : {}) as Partial<CarePlanFeedingSlot>
  return {
    enabled: Boolean(slot.enabled),
    time: normalizeString(slot.time),
    food: normalizeString(slot.food),
    amount: normalizeString(slot.amount),
    additive: normalizeString(slot.additive),
    additiveAmount: normalizeString(slot.additiveAmount),
  }
}

function normalizeMedicationSlot(value: unknown): CarePlanMedicationSlot {
  const slot = (value && typeof value === 'object' ? value : {}) as Partial<CarePlanMedicationSlot>
  return {
    enabled: Boolean(slot.enabled),
    timing: normalizeString(slot.timing),
    medication: normalizeString(slot.medication),
    amount: normalizeString(slot.amount),
  }
}

function padSlots<T>(items: T[], length: number, factory: () => T): T[] {
  const result = items.slice(0, length)
  while (result.length < length) {
    result.push(factory())
  }
  return result
}

export function normalizeCarePlan(input: PetCarePlanInput): PetCarePlan | null {
  if (input == null) return null
  if (typeof input !== 'object') return null

  const raw = input as Record<string, unknown>
  const feedingRaw = Array.isArray(raw.feeding) ? raw.feeding : []
  const medicationRaw = Array.isArray(raw.medication) ? raw.medication : []

  return {
    foodTypes: normalizeFoodTypes(raw.foodTypes),
    intolerances: normalizeString(raw.intolerances),
    individualWishes: normalizeString(raw.individualWishes),
    feeding: padSlots(
      feedingRaw.map(normalizeFeedingSlot),
      CARE_PLAN_SLOT_LABELS.length,
      EMPTY_FEEDING_SLOT
    ),
    medication: padSlots(
      medicationRaw.map(normalizeMedicationSlot),
      CARE_PLAN_SLOT_LABELS.length,
      EMPTY_MEDICATION_SLOT
    ),
  }
}

export function hasMeaningfulCarePlan(plan: PetCarePlan | null): boolean {
  if (!plan) return false
  if (plan.foodTypes.length > 0) return true
  if (plan.intolerances.trim() || plan.individualWishes.trim()) return true
  if (plan.feeding.some((slot) => slot.enabled)) return true
  if (plan.medication.some((slot) => slot.enabled)) return true
  return false
}

export function hasStoredCarePlan(pet: Pick<Pet, 'care_plan'>): boolean {
  const plan = normalizeCarePlan(pet.care_plan)
  return plan != null && hasMeaningfulCarePlan(plan)
}

export function petHasLegacyCareText(
  pet: Pick<Pet, 'futtermenge' | 'medikamente' | 'besonderheiten'>
): boolean {
  return Boolean(
    pet.futtermenge?.trim() || pet.medikamente?.trim() || pet.besonderheiten?.trim()
  )
}

function isFeedingSlotComplete(slot: CarePlanFeedingSlot): boolean {
  if (!slot.enabled) return true
  return Boolean(slot.time && slot.food && slot.amount)
}

function isMedicationSlotComplete(slot: CarePlanMedicationSlot): boolean {
  if (!slot.enabled) return true
  return Boolean(slot.timing && slot.medication && slot.amount)
}

export function getActiveFeedingSlotCount(plan: PetCarePlan): number {
  return plan.feeding.filter((slot) => slot.enabled).length
}

export function getActiveMedicationSlotCount(plan: PetCarePlan): number {
  return plan.medication.filter((slot) => slot.enabled).length
}

export function isCarePlanComplete(
  pet: Pick<Pet, 'care_plan' | 'futtermenge' | 'medikamente' | 'besonderheiten'>,
  options?: { requireMedicationWhenLegacy?: boolean }
): boolean {
  const plan = normalizeCarePlan(pet.care_plan)
  if (!plan) return false

  if (plan.foodTypes.length === 0) return false

  const activeFeeding = plan.feeding.filter((slot) => slot.enabled)
  if (activeFeeding.length === 0) return false
  if (!activeFeeding.every(isFeedingSlotComplete)) return false

  const activeMedication = plan.medication.filter((slot) => slot.enabled)
  if (!activeMedication.every(isMedicationSlotComplete)) return false

  const legacyHasMeds = Boolean(pet.medikamente?.trim())
  if (options?.requireMedicationWhenLegacy && legacyHasMeds && activeMedication.length === 0) {
    return false
  }

  return true
}

export function validateCarePlan(input: PetCarePlanInput): string | null {
  const plan = normalizeCarePlan(input)
  if (!plan) return null

  if (plan.foodTypes.length === 0) {
    return 'Bitte wähle mindestens eine Futterart.'
  }

  const activeFeeding = plan.feeding.filter((slot) => slot.enabled)
  if (activeFeeding.length === 0) {
    return 'Bitte aktiviere mindestens eine Fütterungszeit (morgens, mittags oder abends).'
  }

  for (let index = 0; index < plan.feeding.length; index += 1) {
    const slot = plan.feeding[index]
    if (!slot.enabled) continue
    const label = CARE_PLAN_SLOT_LABELS[index]
    if (!slot.time || !slot.food || !slot.amount) {
      return `Bitte fülle Uhrzeit, Futter und Menge für ${label} aus.`
    }
  }

  for (let index = 0; index < plan.medication.length; index += 1) {
    const slot = plan.medication[index]
    if (!slot.enabled) continue
    const label = CARE_PLAN_SLOT_LABELS[index]
    if (!slot.timing || !slot.medication || !slot.amount) {
      return `Bitte fülle Timing, Medikament und Menge für ${label} aus.`
    }
  }

  return null
}

export function carePlanToLegacyFields(plan: PetCarePlan): {
  futtermenge: string | null
  medikamente: string | null
  besonderheiten: string | null
} {
  const foodTypeLabels = plan.foodTypes
    .map((id) => CARE_PLAN_FOOD_TYPES.find((item) => item.id === id)?.label)
    .filter(Boolean)
    .join(', ')

  const feedingLines = plan.feeding
    .map((slot, index) => {
      if (!slot.enabled) return null
      const parts = [
        `${CARE_PLAN_SLOT_LABELS[index]} ${slot.time}: ${slot.food} ${slot.amount}`.trim(),
      ]
      if (slot.additive) {
        parts.push(`Zusatz: ${slot.additive}${slot.additiveAmount ? ` ${slot.additiveAmount}` : ''}`)
      }
      return parts.join(' – ')
    })
    .filter(Boolean)

  const medicationLines = plan.medication
    .map((slot, index) => {
      if (!slot.enabled) return null
      return `${CARE_PLAN_SLOT_LABELS[index]} (${slot.timing}): ${slot.medication} ${slot.amount}`.trim()
    })
    .filter(Boolean)

  const futtermengeParts = [
    foodTypeLabels ? `Futterarten: ${foodTypeLabels}` : null,
    ...feedingLines,
    plan.intolerances ? `Unverträglichkeiten: ${plan.intolerances}` : null,
  ].filter(Boolean)

  return {
    futtermenge: futtermengeParts.length > 0 ? futtermengeParts.join('\n') : null,
    medikamente: medicationLines.length > 0 ? medicationLines.join('\n') : null,
    besonderheiten: plan.individualWishes.trim() || null,
  }
}

export function carePlanChangeSummary(
  before: PetCarePlan | null,
  after: PetCarePlan
): string {
  const parts: string[] = []

  if (!before || before.foodTypes.join() !== after.foodTypes.join()) {
    const labels = after.foodTypes
      .map((id) => CARE_PLAN_FOOD_TYPES.find((item) => item.id === id)?.label)
      .filter(Boolean)
      .join(', ')
    if (labels) parts.push(`Futterarten: ${labels}`)
  }

  const feedingCount = getActiveFeedingSlotCount(after)
  const medicationCount = getActiveMedicationSlotCount(after)
  parts.push(`${feedingCount} Mahlzeit(en)/Tag`)
  if (medicationCount > 0) {
    parts.push(`${medicationCount} Medikamenten-Gabe(n)/Tag`)
  }

  if (before?.intolerances !== after.intolerances && after.intolerances) {
    parts.push('Unverträglichkeiten geändert')
  }
  if (before?.individualWishes !== after.individualWishes && after.individualWishes) {
    parts.push('Individuelle Wünsche geändert')
  }

  return parts.join(' · ') || 'Pflegeplan aktualisiert'
}

export function hasCarePlanChanged(
  before: PetCarePlanInput,
  after: PetCarePlanInput
): boolean {
  return JSON.stringify(normalizeCarePlan(before)) !== JSON.stringify(normalizeCarePlan(after))
}

export function formatCarePlanSummary(plan: PetCarePlan): string {
  const foodTypes = plan.foodTypes
    .map((id) => CARE_PLAN_FOOD_TYPES.find((item) => item.id === id)?.label)
    .filter(Boolean)
    .join(', ')

  const feeding = plan.feeding
    .filter((slot) => slot.enabled)
    .map((slot, index) => {
      const label = CARE_PLAN_SLOT_LABELS[index]
      return `${label} ${slot.time}: ${slot.food} (${slot.amount})`
    })

  const medication = plan.medication
    .filter((slot) => slot.enabled)
    .map((slot, index) => {
      const label = CARE_PLAN_SLOT_LABELS[index]
      return `${label}: ${slot.medication} (${slot.amount}, ${slot.timing})`
    })

  return [
    foodTypes ? `Futterarten: ${foodTypes}` : null,
    feeding.length > 0 ? feeding.join(' · ') : null,
    medication.length > 0 ? `Medikamente: ${medication.join(' · ')}` : null,
    plan.intolerances ? `Unverträglichkeiten: ${plan.intolerances}` : null,
    plan.individualWishes ? `Wünsche: ${plan.individualWishes}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function getCarePlanMissingLabel(
  pet: Pick<Pet, 'care_plan' | 'futtermenge' | 'medikamente' | 'besonderheiten'>
): string | null {
  if (isCarePlanComplete(pet)) return null
  if (hasStoredCarePlan(pet)) return 'Pflegeplan unvollständig'
  if (petHasLegacyCareText(pet)) return 'Pflegeplan übertragen'
  return 'Pflegeplan fehlt'
}
