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

export const defaultKatzenCancellationSections: CancellationSection[] = [
  {
    title: '',
    policy: [
      { period: '15 Tage und mehr vor Betreuungsbeginn:', refund: 'kostenlos' },
      { period: '14-7 Tage vor Betreuungsbeginn:', refund: '50% der Buchungssumme' },
      { period: '6 Tage und weniger vor Betreuungsbeginn:', refund: '100% der Buchungssumme' },
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

export const defaultCancellationGeneralNotes: string[] = [
  'Absagen werden jeweils bis 18 Uhr berücksichtigt – auch dann, wenn sie an einem Sonn-/Feiertag oder in unserem Urlaub getätigt werden. Die Stornierung muss grundsätzlich in schriftlicher Form über das Kundenportal bzw. per Mail erfolgen.',
  'Bei frühzeitiger Abholung gibt es keine Rückerstattung der gebuchten Tage. Dies gilt auch, wenn ein Tier später als zum vereinbarten Datum in Betreuung gebracht wird.',
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

/**
 * Rendert Storno-Abschnitte und Hinweistexte als semantisches HTML für den Betreuungsvertrag.
 */
export function renderCancellationSectionsToHtml(
  sections: CancellationSection[],
  generalNotes: string[] = defaultCancellationGeneralNotes
): string {
  const parts: string[] = []

  for (const section of sections) {
    if (section.title) {
      parts.push(`<p><strong>${section.title}</strong></p>`)
    }
    if (section.policy && section.policy.length > 0) {
      parts.push('<ul>')
      for (const item of section.policy) {
        if (!item.period && !item.refund) continue
        const periodStr = item.period.endsWith(':') ? item.period : `${item.period}:`
        parts.push(`<li><strong>${periodStr}</strong> ${item.refund}</li>`)
      }
      parts.push('</ul>')
    }
    if (section.notes && section.notes.length > 0) {
      for (const note of section.notes) {
        if (note.trim()) {
          parts.push(`<p>${note.trim()}</p>`)
        }
      }
    }
  }

  if (generalNotes && generalNotes.length > 0) {
    for (const note of generalNotes) {
      if (note.trim()) {
        parts.push(`<p>${note.trim()}</p>`)
      }
    }
  }

  return parts.join('\n')
}

/**
 * Ersetzt den Inhalt des Abschnitts <h2>Stornierung</h2> im Vertragstext durch das übergebene Storno-HTML.
 */
export function injectCancellationPolicyIntoContract(
  contractHtml: string,
  cancellationHtml: string
): string {
  const headingRegex = /<h2\b[^>]*>\s*Stornierung\s*<\/h2>/i
  const match = headingRegex.exec(contractHtml)
  if (!match) {
    return contractHtml
  }

  const headingEndIndex = match.index + match[0].length
  const afterHeading = contractHtml.slice(headingEndIndex)
  const nextHeadingRegex = /<h2\b[^>]*>/i
  const nextMatch = nextHeadingRegex.exec(afterHeading)

  const before = contractHtml.slice(0, headingEndIndex)
  const after = nextMatch ? afterHeading.slice(nextMatch.index) : ''

  return `${before}\n${cancellationHtml.trim()}\n${after}`
}

