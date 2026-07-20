import type { Pet } from '@/lib/types'

export type VaccinationType = 'kombi' | 'zwingerhusten'

export const COMBI_VACCINE_LABELS = [
  'Parvovirose',
  'Leptospirose',
  'Hepatitis',
  'Staupe',
] as const

export const VACCINATION_REMINDER_DAYS = [28, 14] as const
export type VaccinationReminderDays = (typeof VACCINATION_REMINDER_DAYS)[number]

export function isDog(tierart: string | null | undefined): boolean {
  return tierart?.trim().toLowerCase() === 'hund'
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null
  const normalized = value.includes('T') ? value.split('T')[0] : value
  const [year, month, day] = normalized.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

function toDateOnlyString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateDE(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = value instanceof Date ? value : parseDateOnly(value)
  if (!date) return ''
  return date.toLocaleDateString('de-DE')
}

export function getKombiDueDate(
  letzteImpfung: string | null | undefined,
  intervallImpfung: string | null | undefined
): Date | null {
  const base = parseDateOnly(letzteImpfung || '')
  if (!base) return null
  const years = intervallImpfung === 'alle_2_jahre' ? 2 : 1
  return addYears(base, years)
}

export function getZwingerhustenDueDate(
  letzteImpfungZusatz: string | null | undefined
): Date | null {
  const base = parseDateOnly(letzteImpfungZusatz || '')
  if (!base) return null
  return addYears(base, 1)
}

export function getIntervallLabel(intervall: string | null | undefined): string {
  if (intervall === 'alle_2_jahre') return 'Alle 2 Jahre'
  if (intervall === 'jährlich') return 'Jährlich'
  return intervall || ''
}

export function getMissingDogVaccinationFields(pet: Pick<
  Pet,
  'tierart' | 'letzte_impfung' | 'intervall_impfung' | 'letzte_impfung_zusatz'
>): string[] {
  if (!isDog(pet.tierart)) return []

  const missing: string[] = []
  if (!pet.letzte_impfung) missing.push('Datum der Kombiimpfung')
  if (!pet.intervall_impfung) missing.push('Intervall der Kombiimpfung')
  if (!pet.letzte_impfung_zusatz) missing.push('Datum Zwingerhusten')
  return missing
}

export function isDogVaccinationComplete(
  pet: Pick<
    Pet,
    'tierart' | 'letzte_impfung' | 'intervall_impfung' | 'letzte_impfung_zusatz'
  >
): boolean {
  return getMissingDogVaccinationFields(pet).length === 0
}

export function petHasImpfpass(
  petId: string,
  documents: Array<{ pet_id: string | null; document_type: string }>
): boolean {
  return documents.some(
    (doc) => doc.pet_id === petId && doc.document_type === 'impfpass'
  )
}

export function petHasWurmtest(
  petId: string,
  documents: Array<{ pet_id: string | null; document_type: string }>
): boolean {
  return documents.some(
    (doc) => doc.pet_id === petId && doc.document_type === 'wurmtest'
  )
}

export type PetSaveFormData = Pick<
  Pet,
  | 'name'
  | 'tierart'
  | 'letzte_impfung'
  | 'intervall_impfung'
  | 'letzte_impfung_zusatz'
  | 'letzte_stuhlprobe'
>

export function getPetCompletenessIssues(
  pet: Pick<
    Pet,
    | 'id'
    | 'tierart'
    | 'letzte_impfung'
    | 'intervall_impfung'
    | 'letzte_impfung_zusatz'
    | 'letzte_stuhlprobe'
  >,
  documents: Array<{ pet_id: string | null; document_type: string }>
): string[] {
  const issues: string[] = []

  if (!petHasImpfpass(pet.id, documents)) {
    issues.push('Impfpass')
  }
  if (!petHasWurmtest(pet.id, documents)) {
    issues.push('Wurmtest')
  }
  if (!pet.letzte_stuhlprobe) {
    issues.push('Entwurmungsdatum')
  }
  if (isDog(pet.tierart)) {
    issues.push(...getMissingDogVaccinationFields(pet))
  }

  return issues
}

export function validatePetSaveRequired(formData: PetSaveFormData): string | null {
  if (!formData.name?.trim()) {
    return 'Name des Tieres ist erforderlich.'
  }
  if (!formData.tierart?.trim()) {
    return 'Tierart ist erforderlich.'
  }

  const dateError = validateVaccinationDates({
    tierart: formData.tierart,
    letzte_impfung: formData.letzte_impfung,
    letzte_impfung_zusatz: formData.letzte_impfung_zusatz,
  })
  if (dateError) return dateError

  const today = getTodayDateOnly()
  if (formData.letzte_stuhlprobe && formData.letzte_stuhlprobe > today) {
    return 'Das Datum der letzten Entwurmung/Stuhlprobe darf nicht in der Zukunft liegen.'
  }

  return null
}

export function getPetSaveWarnings(input: {
  formData: PetSaveFormData
  documents: Array<{ pet_id: string | null; document_type: string }>
  editingPetId?: string | null
  impfpassFile?: File | null
  wurmtestFile?: File | null
}): string[] {
  const { formData, documents, editingPetId, impfpassFile, wurmtestFile } = input
  const missing: string[] = []

  const hasExistingImpfpass =
    !!editingPetId && petHasImpfpass(editingPetId, documents)
  const hasExistingWurmtest =
    !!editingPetId && petHasWurmtest(editingPetId, documents)

  if (!impfpassFile && !hasExistingImpfpass) missing.push('Impfpass')
  if (!wurmtestFile && !hasExistingWurmtest) missing.push('Wurmtest')
  if (!formData.letzte_stuhlprobe) missing.push('Entwurmungsdatum')
  if (isDog(formData.tierart)) {
    missing.push(...getMissingDogVaccinationFields(formData))
  }

  return missing
}

export function formatPetSaveWarning(missing: string[]): string | null {
  if (missing.length === 0) return null
  return `Bitte ergänze noch: ${missing.join(', ')}. Du kannst jetzt speichern und fehlende Angaben später im Dashboard nachtragen.`
}

export function getDogVaccinationIssues(
  pet: Pick<
    Pet,
    'id' | 'tierart' | 'letzte_impfung' | 'intervall_impfung' | 'letzte_impfung_zusatz' | 'letzte_stuhlprobe'
  >,
  documents: Array<{ pet_id: string | null; document_type: string }>
): string[] {
  if (!isDog(pet.tierart)) return []
  return getPetCompletenessIssues(pet, documents)
}

export function getVaccinationTypeLabel(type: VaccinationType): string {
  return type === 'kombi'
    ? `Kombiimpfung (${COMBI_VACCINE_LABELS.join(', ')})`
    : 'Zwingerhusten'
}

export type VaccinationReminderCandidate = {
  petId: string
  petName: string
  customerEmail: string
  customerName: string
  vaccinationType: VaccinationType
  dueDate: string
  daysBefore: VaccinationReminderDays
}

export type UpcomingVaccinationStatus = 'overdue' | 'due_soon' | 'upcoming' | 'incomplete'

export type UpcomingVaccinationRow = {
  petId: string
  petName: string
  customerId: string
  customerName: string
  customerEmail: string | null
  vaccinationType: VaccinationType
  lastVaccinationDate: string | null
  dueDate: string | null
  daysUntilDue: number | null
  status: UpcomingVaccinationStatus
}

export type UpcomingVaccinationSummary = {
  overdue: number
  dueSoon: number
  upcoming: number
  incomplete: number
}

export type UpcomingVaccinationFilters = {
  days?: number
  status?: 'all' | UpcomingVaccinationStatus
  type?: 'all' | VaccinationType
  today?: Date
}

function normalizeDateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  return value.includes('T') ? value.split('T')[0] : value
}

function getVaccinationStatus(
  daysUntilDue: number | null
): Exclude<UpcomingVaccinationStatus, 'incomplete'> | null {
  if (daysUntilDue === null) return null
  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue <= 14) return 'due_soon'
  return 'upcoming'
}

const STATUS_SORT_ORDER: Record<UpcomingVaccinationStatus, number> = {
  overdue: 0,
  due_soon: 1,
  upcoming: 2,
  incomplete: 3,
}

function sortUpcomingRows(rows: UpcomingVaccinationRow[]): UpcomingVaccinationRow[] {
  return [...rows].sort((a, b) => {
    const statusDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]
    if (statusDiff !== 0) return statusDiff

    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate)
    }

    const nameDiff = a.petName.localeCompare(b.petName, 'de')
    if (nameDiff !== 0) return nameDiff

    return a.vaccinationType.localeCompare(b.vaccinationType)
  })
}

function summarizeUpcomingRows(rows: UpcomingVaccinationRow[]): UpcomingVaccinationSummary {
  return rows.reduce<UpcomingVaccinationSummary>(
    (summary, row) => {
      if (row.status === 'overdue') summary.overdue += 1
      if (row.status === 'due_soon') summary.dueSoon += 1
      if (row.status === 'upcoming') summary.upcoming += 1
      if (row.status === 'incomplete') summary.incomplete += 1
      return summary
    },
    { overdue: 0, dueSoon: 0, upcoming: 0, incomplete: 0 }
  )
}

function isKombiIncomplete(pet: Pick<Pet, 'letzte_impfung' | 'intervall_impfung'>): boolean {
  return !pet.letzte_impfung || !pet.intervall_impfung
}

function isZwingerhustenIncomplete(pet: Pick<Pet, 'letzte_impfung_zusatz'>): boolean {
  return !pet.letzte_impfung_zusatz
}

export function getUpcomingVaccinationRows(
  pets: Array<
    Pick<
      Pet,
      | 'id'
      | 'name'
      | 'customer_id'
      | 'tierart'
      | 'letzte_impfung'
      | 'intervall_impfung'
      | 'letzte_impfung_zusatz'
    > & {
      customerName?: string
      customerEmail?: string | null
    }
  >,
  filters: UpcomingVaccinationFilters = {}
): { rows: UpcomingVaccinationRow[]; summary: UpcomingVaccinationSummary } {
  const today = filters.today || new Date()
  const horizonDays = filters.days ?? 90
  const statusFilter = filters.status ?? 'all'
  const typeFilter = filters.type ?? 'all'

  const allRows: UpcomingVaccinationRow[] = []

  for (const pet of pets) {
    if (!isDog(pet.tierart)) continue

    const customerName = pet.customerName || ''
    const customerEmail = pet.customerEmail ?? null

    const entries: Array<{
      type: VaccinationType
      lastVaccinationDate: string | null
      dueDate: Date | null
      incomplete: boolean
    }> = [
      {
        type: 'kombi',
        lastVaccinationDate: normalizeDateOnly(pet.letzte_impfung),
        dueDate: getKombiDueDate(pet.letzte_impfung, pet.intervall_impfung),
        incomplete: isKombiIncomplete(pet),
      },
      {
        type: 'zwingerhusten',
        lastVaccinationDate: normalizeDateOnly(pet.letzte_impfung_zusatz),
        dueDate: getZwingerhustenDueDate(pet.letzte_impfung_zusatz),
        incomplete: isZwingerhustenIncomplete(pet),
      },
    ]

    for (const entry of entries) {
      if (entry.incomplete || !entry.dueDate) {
        allRows.push({
          petId: pet.id,
          petName: pet.name,
          customerId: pet.customer_id,
          customerName,
          customerEmail,
          vaccinationType: entry.type,
          lastVaccinationDate: entry.lastVaccinationDate,
          dueDate: null,
          daysUntilDue: null,
          status: 'incomplete',
        })
        continue
      }

      const dueDate = getDueDateString(entry.dueDate)
      const daysUntilDue = daysBetween(today, entry.dueDate)
      const status = getVaccinationStatus(daysUntilDue)
      if (!status) continue

      if (status !== 'overdue' && daysUntilDue > horizonDays) {
        continue
      }

      allRows.push({
        petId: pet.id,
        petName: pet.name,
        customerId: pet.customer_id,
        customerName,
        customerEmail,
        vaccinationType: entry.type,
        lastVaccinationDate: entry.lastVaccinationDate,
        dueDate,
        daysUntilDue,
        status,
      })
    }
  }

  const sortedRows = sortUpcomingRows(allRows)
  const summary = summarizeUpcomingRows(sortedRows)

  const filteredRows = sortedRows.filter((row) => {
    if (statusFilter !== 'all' && row.status !== statusFilter) return false
    if (typeFilter !== 'all' && row.vaccinationType !== typeFilter) return false
    return true
  })

  return { rows: filteredRows, summary }
}

export function getUpcomingVaccinationStatusLabel(status: UpcomingVaccinationStatus): string {
  switch (status) {
    case 'overdue':
      return 'Überfällig'
    case 'due_soon':
      return 'In 14 Tagen'
    case 'upcoming':
      return 'Anstehend'
    case 'incomplete':
      return 'Unvollständig'
  }
}

export function getDueDateString(date: Date): string {
  return toDateOnlyString(date)
}

export function getTodayDateOnly(): string {
  return toDateOnlyString(new Date())
}

function daysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export function getReminderCandidatesForPet(input: {
  pet: Pick<
    Pet,
    'id' | 'name' | 'tierart' | 'letzte_impfung' | 'intervall_impfung' | 'letzte_impfung_zusatz'
  >
  customerEmail: string
  customerName: string
  today?: Date
}): VaccinationReminderCandidate[] {
  if (!isDog(input.pet.tierart) || !input.customerEmail) return []

  const today = input.today || new Date()
  const candidates: VaccinationReminderCandidate[] = []

  const entries: Array<{ type: VaccinationType; dueDate: Date | null }> = [
    {
      type: 'kombi',
      dueDate: getKombiDueDate(input.pet.letzte_impfung, input.pet.intervall_impfung),
    },
    {
      type: 'zwingerhusten',
      dueDate: getZwingerhustenDueDate(input.pet.letzte_impfung_zusatz),
    },
  ]

  for (const entry of entries) {
    if (!entry.dueDate) continue
    const dueDate = getDueDateString(entry.dueDate)
    const daysUntilDue = daysBetween(today, entry.dueDate)

    for (const daysBefore of VACCINATION_REMINDER_DAYS) {
      if (daysUntilDue === daysBefore) {
        candidates.push({
          petId: input.pet.id,
          petName: input.pet.name,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          vaccinationType: entry.type,
          dueDate,
          daysBefore,
        })
      }
    }
  }

  return candidates
}

export function validateVaccinationDates(input: {
  tierart: string | null | undefined
  letzte_impfung?: string | null
  letzte_impfung_zusatz?: string | null
}): string | null {
  const today = getTodayDateOnly()

  if (isDog(input.tierart)) {
    if (input.letzte_impfung && input.letzte_impfung > today) {
      return 'Das Datum der Kombiimpfung darf nicht in der Zukunft liegen.'
    }
    if (input.letzte_impfung_zusatz && input.letzte_impfung_zusatz > today) {
      return 'Das Datum der Zwingerhusten-Impfung darf nicht in der Zukunft liegen.'
    }
    return null
  }

  if (input.letzte_impfung && input.letzte_impfung > today) {
    return 'Das Datum der letzten Impfung darf nicht in der Zukunft liegen.'
  }

  return null
}

export function getDogVaccinationWarnings(
  pet: Pick<
    Pet,
    'tierart' | 'letzte_impfung' | 'intervall_impfung' | 'letzte_impfung_zusatz'
  >
): string[] {
  if (!isDog(pet.tierart)) return []
  const missing = getMissingDogVaccinationFields(pet)
  const warning = formatPetSaveWarning(missing)
  return warning ? [warning] : []
}
