export interface CancellationPeriodRefund {
  period: string
  refund: string
}

export interface CancellationSection {
  title?: string
  policy: CancellationPeriodRefund[]
  notes?: string[]
}

export interface CancellationPolicyContent {
  cancellationPolicyTitle?: string
  cancellationTitle?: string
  cancellationSections?: CancellationSection[]
  /** @deprecated Legacy flat list – wird beim Lesen in einen Abschnitt gewrappt */
  cancellationPolicy?: CancellationPeriodRefund[]
  cancellationNotes?: string[]
}

const SCHULFERIEN_TITLE =
  'ACHTUNG - Für die Stornierung von Aufenthalten die in die gesetzlichen Schulferien des Landes BW fallen, gelten folgende Stornofristen:'

export const defaultPensionCancellationSections: CancellationSection[] = [
  {
    title: '',
    policy: [
      { period: '15 Tage und mehr vor Check-In', refund: '100% Rückerstattung' },
      { period: '14 - 7 Tage vor Check-In', refund: '50% Rückerstattung' },
      { period: '6 Tage und weniger vor Check-In', refund: 'keine Rückerstattung' },
    ],
    notes: [],
  },
]

export const defaultKatzenCancellationSections: CancellationSection[] = [
  {
    title: '',
    policy: [
      { period: '15 Tage und mehr vor Betreuungsbeginn', refund: '100% Rückerstattung' },
      { period: '14-7 Tage vor Betreuungsbeginn', refund: '50% Rückerstattung' },
      { period: '6 Tage und weniger vor Betreuungsbeginn', refund: 'keine Rückerstattung' },
    ],
    notes: [],
  },
]

export const defaultPortalCancellationSections: CancellationSection[] = [
  {
    title: '',
    policy: [
      { period: '15 Tage und mehr vor Check-In:', refund: 'kostenlos' },
      { period: '14 - 7 Tage vor Check-In:', refund: '50% der Buchungssumme' },
      { period: '6 Tage und weniger vor Check-In:', refund: '100% der Buchungssumme' },
    ],
    notes: [],
  },
  {
    title: SCHULFERIEN_TITLE,
    policy: [
      { period: '56 Tage und mehr vor Check-In:', refund: 'kostenlos' },
      { period: '55-21 Tage vor Check-In:', refund: '50% der Buchungssumme' },
      { period: '20 Tage und weniger vor Check-In:', refund: '100% der Buchungssumme' },
    ],
    notes: [],
  },
]

function pickPolicyList(value: unknown): CancellationPeriodRefund[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const period = typeof row.period === 'string' ? row.period : ''
      const refund = typeof row.refund === 'string' ? row.refund : ''
      if (!period && !refund) return null
      return { period, refund }
    })
    .filter((row): row is CancellationPeriodRefund => row !== null)
}

function pickStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function pickSections(value: unknown): CancellationSection[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const title = typeof row.title === 'string' ? row.title : ''
      const policy = pickPolicyList(row.policy)
      const notes = pickStringArray(row.notes)
      if (!title && policy.length === 0 && notes.length === 0) return null
      return { title, policy, notes }
    })
    .filter((section): section is CancellationSection => section !== null)
}

/** Normalisiert CMS-Daten zu Abschnitten; Legacy-Flat-Liste wird in einen Abschnitt gewrappt. */
export function normalizeCancellationSections(
  data: CancellationPolicyContent | null | undefined,
  fallbackSections: CancellationSection[]
): CancellationSection[] {
  const sections = pickSections(data?.cancellationSections)
  if (sections.length > 0) return sections

  const legacyPolicy = pickPolicyList(data?.cancellationPolicy)
  if (legacyPolicy.length > 0) {
    return [{ title: '', policy: legacyPolicy, notes: [] }]
  }

  return fallbackSections
}

/** Liefert Abschnitte für den CMS-Editor – behält leere Platzhalter beim Bearbeiten. */
export function getCancellationSectionsForEditor(
  data: CancellationPolicyContent | null | undefined,
  fallbackSections: CancellationSection[]
): CancellationSection[] {
  if (Array.isArray(data?.cancellationSections)) {
    return data.cancellationSections
  }
  return normalizeCancellationSections(data, fallbackSections)
}

export function getCancellationMainTitle(
  data: CancellationPolicyContent | null | undefined,
  fallback: string,
  variant: 'pension' | 'portal' = 'pension'
): string {
  if (!data) return fallback
  if (variant === 'portal') {
    return typeof data.cancellationTitle === 'string' && data.cancellationTitle.length > 0
      ? data.cancellationTitle
      : fallback
  }
  return typeof data.cancellationPolicyTitle === 'string' && data.cancellationPolicyTitle.length > 0
    ? data.cancellationPolicyTitle
    : fallback
}

export function emptyCancellationSection(): CancellationSection {
  return { title: '', policy: [{ period: '', refund: '' }], notes: [] }
}
