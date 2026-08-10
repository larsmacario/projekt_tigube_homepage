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

/** @deprecated Legacy slot format – migrated automatically via normalizeCarePlan */
export interface CarePlanMedicationSlot {
  enabled: boolean
  timing: string
  medication: string
  amount: string
}

export interface CarePlanMedicationEntry {
  timeSlot: CarePlanSlotLabel
  timing: string
  medication: string
  amount: string
}

export interface PetCarePlan {
  foodTypes: CarePlanFoodTypeId[]
  intolerances: string
  individualWishes: string
  feeding: CarePlanFeedingSlot[]
  medication: CarePlanMedicationEntry[]
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

export function emptyMedicationEntry(
  timeSlot: CarePlanSlotLabel = 'Morgens'
): CarePlanMedicationEntry {
  return {
    timeSlot,
    timing: '',
    medication: '',
    amount: '',
  }
}

export function nextTimeSlot(timeSlot: CarePlanSlotLabel): CarePlanSlotLabel {
  const index = CARE_PLAN_SLOT_LABELS.indexOf(timeSlot)
  const nextIndex = index >= 0 ? (index + 1) % CARE_PLAN_SLOT_LABELS.length : 0
  return CARE_PLAN_SLOT_LABELS[nextIndex]
}

export function emptyPetCarePlan(): PetCarePlan {
  return {
    foodTypes: [],
    intolerances: '',
    individualWishes: '',
    feeding: CARE_PLAN_SLOT_LABELS.map(() => EMPTY_FEEDING_SLOT()),
    medication: [],
  }
}

function normalizeString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeTimeSlot(value: unknown): CarePlanSlotLabel {
  if (typeof value === 'string' && CARE_PLAN_SLOT_LABELS.includes(value as CarePlanSlotLabel)) {
    return value as CarePlanSlotLabel
  }
  return 'Morgens'
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

function isLegacyMedicationArray(items: unknown[]): boolean {
  return items.some(
    (item) => item != null && typeof item === 'object' && 'enabled' in item
  )
}

function migrateLegacyMedication(items: unknown[]): CarePlanMedicationEntry[] {
  const entries: CarePlanMedicationEntry[] = []

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const slot = item as Partial<CarePlanMedicationSlot>
    if (!slot.enabled) return

    entries.push({
      timeSlot: CARE_PLAN_SLOT_LABELS[index] ?? 'Morgens',
      timing: normalizeString(slot.timing),
      medication: normalizeString(slot.medication),
      amount: normalizeString(slot.amount),
    })
  })

  return entries
}

function normalizeMedicationEntry(value: unknown): CarePlanMedicationEntry | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Partial<CarePlanMedicationEntry & CarePlanMedicationSlot>
  const timing = normalizeString(raw.timing)
  const medication = normalizeString(raw.medication)
  const amount = normalizeString(raw.amount)

  if (!timing && !medication && !amount) return null

  return {
    timeSlot: normalizeTimeSlot(raw.timeSlot),
    timing,
    medication,
    amount,
  }
}

function normalizeMedicationList(items: unknown[]): CarePlanMedicationEntry[] {
  if (items.length === 0) return []

  if (isLegacyMedicationArray(items)) {
    return migrateLegacyMedication(items)
  }

  return items
    .map(normalizeMedicationEntry)
    .filter((entry): entry is CarePlanMedicationEntry => entry != null)
}

function padSlots<T>(items: T[], length: number, factory: () => T): T[] {
  const result = items.slice(0, length)
  while (result.length < length) {
    result.push(factory())
  }
  return result
}

export function isMedicationEntryEmpty(entry: CarePlanMedicationEntry): boolean {
  return !entry.timing && !entry.medication && !entry.amount
}

export function isMedicationEntryComplete(entry: CarePlanMedicationEntry): boolean {
  if (isMedicationEntryEmpty(entry)) return true
  return Boolean(entry.timing && entry.medication && entry.amount)
}

export function getActiveMedicationEntries(
  plan: PetCarePlan
): CarePlanMedicationEntry[] {
  return plan.medication.filter((entry) => !isMedicationEntryEmpty(entry))
}

export function groupMedicationsByTimeSlot(
  entries: CarePlanMedicationEntry[]
): Record<CarePlanSlotLabel, CarePlanMedicationEntry[]> {
  const grouped = Object.fromEntries(
    CARE_PLAN_SLOT_LABELS.map((label) => [label, [] as CarePlanMedicationEntry[]])
  ) as Record<CarePlanSlotLabel, CarePlanMedicationEntry[]>

  for (const entry of entries) {
    if (isMedicationEntryEmpty(entry)) continue
    grouped[entry.timeSlot].push(entry)
  }

  return grouped
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
    medication: normalizeMedicationList(medicationRaw),
  }
}

/** Behält leere Medikamenten-Zeilen für die Formularbearbeitung. */
export function normalizeCarePlanForForm(input: PetCarePlanInput): PetCarePlan {
  const base = normalizeCarePlan(input) ?? emptyPetCarePlan()
  if (input == null || typeof input !== 'object') return base

  const medicationRaw = Array.isArray((input as Record<string, unknown>).medication)
    ? ((input as Record<string, unknown>).medication as unknown[])
    : []

  if (isLegacyMedicationArray(medicationRaw)) {
    return base
  }

  return {
    ...base,
    medication: medicationRaw.map((item) => {
      if (!item || typeof item !== 'object') return emptyMedicationEntry()
      const raw = item as Partial<CarePlanMedicationEntry>
      return {
        timeSlot: normalizeTimeSlot(raw.timeSlot),
        timing: normalizeString(raw.timing),
        medication: normalizeString(raw.medication),
        amount: normalizeString(raw.amount),
      }
    }),
  }
}

export function hasMeaningfulCarePlan(plan: PetCarePlan | null): boolean {
  if (!plan) return false
  if (plan.foodTypes.length > 0) return true
  if (plan.intolerances.trim() || plan.individualWishes.trim()) return true
  if (plan.feeding.some((slot) => slot.enabled)) return true
  if (getActiveMedicationEntries(plan).length > 0) return true
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

export function getActiveFeedingSlotCount(plan: PetCarePlan): number {
  return plan.feeding.filter((slot) => slot.enabled).length
}

export function getActiveMedicationSlotCount(plan: PetCarePlan): number {
  return getActiveMedicationEntries(plan).length
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

  const activeMedication = getActiveMedicationEntries(plan)
  if (!activeMedication.every(isMedicationEntryComplete)) return false

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

  for (const entry of plan.medication) {
    if (isMedicationEntryEmpty(entry)) continue
    if (isMedicationEntryComplete(entry)) continue

    const label = entry.medication || 'Medikament'
    return `Bitte fülle Timing, Medikament und Menge für ${entry.timeSlot} (${label}) aus.`
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

  const medicationLines = getActiveMedicationEntries(plan).map(
    (entry) =>
      `${entry.timeSlot} (${entry.timing}): ${entry.medication} ${entry.amount}`.trim()
  )

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

  const medication = getActiveMedicationEntries(plan).map(
    (entry) => `${entry.timeSlot}: ${entry.medication} (${entry.amount}, ${entry.timing})`
  )

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
