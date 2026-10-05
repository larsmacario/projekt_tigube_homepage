import { policyToCancellationSections } from '@/lib/cancellation-policy-display'
import { CANCELLATION_POLICY_V2_CONFIG } from '@/lib/cancellation-policy-seed-v2'
import type { CancellationSection } from '@/lib/cms/cancellation-policy'
import {
  defaultPickupTimeDefaults,
  normalizePickupTimeDefaults,
  type PickupTimeDefaults,
} from '@/lib/pickup-time-defaults'

export type { PickupTimeDefaults }

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
  pickupTimeDefaults?: PickupTimeDefaults
  documentsTitle?: string
  documentsIntro?: string
  documentsItems?: KundenportalDocumentItem[]
  cancellationTitle?: string
  cancellationSections?: CancellationSection[]
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
  pickupTimesNote: 'Andere Zeiten nur auf Anfrage.',
  pickupTimeDefaults: defaultPickupTimeDefaults,
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
        'Wurmkur mit Nachweis vom Tierarzt (den Nachweis bitte im Impfpass vermerken lassen) bzw. Kot-Test beim Check-In. Am besten ganz frisch, jedoch nicht älter als 3 Monate.',
    },
    {
      title: '',
      description:
        'Bitte sorge im eigenen Interesse für einen ausreichenden Schutz gegen Parasiten wie Zecken und Flöhe.',
    },
  ],
  cancellationTitle: 'Stornierung',
  cancellationSections: policyToCancellationSections(
    CANCELLATION_POLICY_V2_CONFIG,
    'hundepension',
    'portal'
  ),
  cancellationPolicy: [],
  cancellationNotes: CANCELLATION_POLICY_V2_CONFIG.generalNotes,
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
    pickupTimeDefaults: normalizePickupTimeDefaults(p.pickupTimeDefaults ?? d.pickupTimeDefaults),
    documentsTitle: pickString(p.documentsTitle, d.documentsTitle!),
    documentsIntro: pickString(p.documentsIntro, d.documentsIntro!),
    documentsItems: pickDocumentItems(p.documentsItems, d.documentsItems!),
    cancellationTitle: d.cancellationTitle!,
    cancellationSections: d.cancellationSections!,
    cancellationPolicy: d.cancellationPolicy!,
    cancellationNotes: d.cancellationNotes!,
  }
}
