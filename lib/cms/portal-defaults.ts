export interface KundenportalDocumentItem {
  title: string
  description?: string
}

export interface KundenportalPeriodRefund {
  period: string
  refund: string
}

export interface KundenportalPickupRow {
  days: string
  times: string
}

export interface KundenportalData {
  checklistTitle?: string
  checklistSubtitle?: string
  checklistSectionTitle?: string
  checklistItems?: string[]
  checklistWarningTitle?: string
  checklistWarningNotes?: string[]
  infosTitle?: string
  pickupTimesTitle?: string
  pickupTimesList?: KundenportalPickupRow[]
  pickupTimesNote?: string
  documentsTitle?: string
  documentsIntro?: string
  documentsItems?: KundenportalDocumentItem[]
  cancellationTitle?: string
  cancellationPolicy?: KundenportalPeriodRefund[]
  cancellationNotes?: string[]
}

export const defaultKundenportalData: KundenportalData = {
  checklistTitle: 'CHECKLISTE',
  checklistSubtitle: 'für den Hundeurlaub in der Pension',
  checklistSectionTitle: 'für den Aufenthalt mitbringen',
  checklistItems: [
    'Leine - Halsband - Geschirr',
    'Steuermarke',
    'Fressnapf - Wassernapf',
    'Futter - Leckerlis',
    'Bettchen - Kissen - Kuscheldecke - Box/Hundezelt',
    'Medikamente - Nahrungsergänzung inkl. Verabreichungsplan',
    'Kopie der aktuellen Hundehalter-Haftpflicht',
  ],
  checklistWarningTitle: 'ACHTUNG:',
  checklistWarningNotes: [
    'Erneuere rechtzeitig den benötigten Impfschutz, sorge für eine Entwurmung oder eine Kotuntersuchung und führe eine Ungeziefer-Prävention durch, um deinen Hund maximal zu schützen.',
    'Stelle unbedingt sicher, dass Dritte in der Hundehalter-Haftpflicht mit inbegriffen sind.',
    'Fress- und Wassernapf sowie ein Bettchen mit Kuscheldecke stellen wir auf Wunsch selbstverständlich zur Verfügung. Dennoch macht es durchaus Sinn, die gewohnten Sachen von zu Hause in den Urlaub mitzugeben, um etwas Vertrautes in der neuen Umgebung dabei zu haben.',
  ],
  infosTitle: 'Die wichtigsten Infos auf einen Blick',
  pickupTimesTitle: 'Unsere Bring- und Holzeiten',
  pickupTimesList: [
    { days: 'Montag - Freitag', times: '7-8h / 12-14h (mit Termin) / 17-18h' },
    { days: 'Samstag, Sonntag, Feiertag', times: '9-10h / 17-18h' },
  ],
  pickupTimesNote:
    'Außerhalb der offiziellen Zeiten nur mit Termin und gegen Aufpreis.',
  documentsTitle: 'Nötige Unterlagen für den Hundeurlaub und die Tagesbetreuung',
  documentsIntro:
    'Diese Unterlagen sind zwingend notwendig für den Aufenthalt in unserer Pension. Bitte überprüfe rechtzeitig vor dem Urlaubsantritt, ob sie auf dem aktuellen Stand sind. Ohne gültige Nachweise kann keine Betreuung stattfinden.',
  documentsItems: [
    {
      title: 'Impfpass mit den erforderlichen Impfungen',
      description: 'Parvovirose, Leptospirose, Hepatitis, Staupe, Zwingerhusten',
    },
    {
      title: 'Entwurmung/Kot-Test',
      description:
        'Wurmkur mit Nachweis vom Tierarzt (den Nachweis bitte im Impfpass vermerken lassen) bzw. Kot-Test beim Check-In. Am Besten ganz frisch, jedoch nicht älter als 3 Monate.',
    },
    {
      title: '',
      description:
        'Bitte sorge im eigenen Interesse für einen ausreichenden Schutz gegen Parasiten wie Zecken und Flöhe.',
    },
  ],
  cancellationTitle: 'Stornierung',
  cancellationPolicy: [
    { period: '15 Tage und mehr vor Check-In:', refund: 'kostenlos' },
    { period: '14 - 7 Tage vor Check-In:', refund: '50% der Buchungssumme' },
    { period: '6 Tage und weniger vor Check-In:', refund: '100% der Buchungssumme' },
  ],
  cancellationNotes: [
    'Absagen werden jeweils bis 18h berücksichtigt - auch dann, wenn sie an einem Sonn-/Feiertag oder in unserem Urlaub getätigt werden. Die Stornierung muss grundsätzlich in schriftlicher Form per Mail oder WhatsApp erfolgen.',
    'Bei frühzeitiger Abholung gibt es keine Rückerstattung der gebuchten Tage. Dies gilt auch, wenn ein Hund später als zum vereinbarten Datum in Betreuung gebracht wird.',
    'Tagesgäste müssen spätestens bis Mittwochabend ihren nicht benötigten Platz für die kommende Woche absagen, damit wir am Donnerstag unseren Springern den Platz anbieten können. Wird der Platz später abgesagt, gelten die o.g. Stornobedingungen.',
  ],
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function pickStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value) || value.length === 0) return fallback
  const filtered = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  return filtered.length > 0 ? filtered : fallback
}

function pickPickupList(
  value: unknown,
  fallback: KundenportalPickupRow[]
): KundenportalPickupRow[] {
  if (!Array.isArray(value) || value.length === 0) return fallback
  const rows = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const days = typeof row.days === 'string' ? row.days : ''
      const times = typeof row.times === 'string' ? row.times : ''
      if (!days && !times) return null
      return { days, times }
    })
    .filter((row): row is KundenportalPickupRow => row !== null)
  return rows.length > 0 ? rows : fallback
}

function pickDocumentItems(
  value: unknown,
  fallback: KundenportalDocumentItem[]
): KundenportalDocumentItem[] {
  if (!Array.isArray(value) || value.length === 0) return fallback
  const items = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const title = typeof row.title === 'string' ? row.title : ''
      const description = typeof row.description === 'string' ? row.description : undefined
      if (!title && !description) return null
      return { title, description }
    })
    .filter((item): item is KundenportalDocumentItem => item !== null)
  return items.length > 0 ? items : fallback
}

function pickPolicyList(
  value: unknown,
  fallback: KundenportalPeriodRefund[]
): KundenportalPeriodRefund[] {
  if (!Array.isArray(value) || value.length === 0) return fallback
  const rows = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const period = typeof row.period === 'string' ? row.period : ''
      const refund = typeof row.refund === 'string' ? row.refund : ''
      if (!period && !refund) return null
      return { period, refund }
    })
    .filter((row): row is KundenportalPeriodRefund => row !== null)
  return rows.length > 0 ? rows : fallback
}

/** Merges partial CMS JSON with canonical portal defaults. */
export function mergeKundenportalData(partial: KundenportalData | null | undefined): KundenportalData {
  const d = defaultKundenportalData
  const p = partial ?? {}
  return {
    checklistTitle: pickString(p.checklistTitle, d.checklistTitle!),
    checklistSubtitle: pickString(p.checklistSubtitle, d.checklistSubtitle!),
    checklistSectionTitle: pickString(p.checklistSectionTitle, d.checklistSectionTitle!),
    checklistItems: pickStringArray(p.checklistItems, d.checklistItems!),
    checklistWarningTitle: pickString(p.checklistWarningTitle, d.checklistWarningTitle!),
    checklistWarningNotes: pickStringArray(p.checklistWarningNotes, d.checklistWarningNotes!),
    infosTitle: pickString(p.infosTitle, d.infosTitle!),
    pickupTimesTitle: pickString(p.pickupTimesTitle, d.pickupTimesTitle!),
    pickupTimesList: pickPickupList(p.pickupTimesList, d.pickupTimesList!),
    pickupTimesNote: pickString(p.pickupTimesNote, d.pickupTimesNote!),
    documentsTitle: pickString(p.documentsTitle, d.documentsTitle!),
    documentsIntro: pickString(p.documentsIntro, d.documentsIntro!),
    documentsItems: pickDocumentItems(p.documentsItems, d.documentsItems!),
    cancellationTitle: pickString(p.cancellationTitle, d.cancellationTitle!),
    cancellationPolicy: pickPolicyList(p.cancellationPolicy, d.cancellationPolicy!),
    cancellationNotes: pickStringArray(p.cancellationNotes, d.cancellationNotes!),
  }
}
