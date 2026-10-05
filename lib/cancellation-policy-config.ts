import { CANCELLATION_POLICY_V2_CONFIG } from '@/lib/cancellation-policy-seed-v2'

export type CancellationRuleSetCondition =
  | { type: 'default' }
  | { type: 'school_holidays_bw' }

export type CancellationServiceScope = 'hundepension' | 'katzenbetreuung' | 'tagesbetreuung'

export type CancellationDisplayChannel = 'landing' | 'contract' | 'portal'

export interface CancellationDisplayTexts {
  period: string
  refund: string
}

export interface CancellationPolicyTier {
  minDaysBefore: number
  maxDaysBefore: number | null
  chargePercent: number
  label: string
  display?: Partial<Record<CancellationDisplayChannel, CancellationDisplayTexts>>
}

export interface CancellationPolicyRuleSet {
  id: string
  name: string
  condition: CancellationRuleSetCondition
  priority: number
  serviceScopes: CancellationServiceScope[]
  sectionTitles?: Partial<Record<CancellationDisplayChannel, string>>
  tiers: CancellationPolicyTier[]
  notes?: string[]
}

export interface CancellationPolicyConfig {
  title: string
  displayTitles?: {
    landing?: Partial<Record<'hundepension' | 'katzenbetreuung', string>>
    portal?: string
    contract?: string
  }
  cutoffHour: number
  generalNotes: string[]
  ruleSets: CancellationPolicyRuleSet[]
}

export interface CancellationPolicyRecord {
  id: string
  version: number
  is_active: boolean
  config: CancellationPolicyConfig
  created_at: string
  updated_at: string
}

export const DEFAULT_CANCELLATION_POLICY_CONFIG: CancellationPolicyConfig = CANCELLATION_POLICY_V2_CONFIG

export function refundTextFromChargePercent(
  chargePercent: number,
  channel: CancellationDisplayChannel = 'contract'
): string {
  if (channel === 'landing') {
    if (chargePercent === 0) return '100% Rückerstattung'
    if (chargePercent === 100) return 'keine Rückerstattung'
    return `${chargePercent}% Rückerstattung`
  }
  if (chargePercent === 0) return 'kostenlos'
  if (chargePercent === 100) return '100% der Buchungssumme'
  return `${chargePercent}% der Buchungssumme`
}

function normalizeDisplayTexts(value: unknown): CancellationDisplayTexts | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const period = typeof row.period === 'string' ? row.period : ''
  const refund = typeof row.refund === 'string' ? row.refund : ''
  if (!period && !refund) return null
  return { period, refund }
}

function normalizeTier(value: unknown): CancellationPolicyTier | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const minDaysBefore = typeof row.minDaysBefore === 'number' ? row.minDaysBefore : null
  const chargePercent = typeof row.chargePercent === 'number' ? row.chargePercent : null
  const label = typeof row.label === 'string' ? row.label : ''
  if (minDaysBefore == null || chargePercent == null) return null

  const displayRaw = row.display as Record<string, unknown> | undefined
  const display: CancellationPolicyTier['display'] = {}
  if (displayRaw) {
    for (const channel of ['landing', 'contract', 'portal'] as const) {
      const texts = normalizeDisplayTexts(displayRaw[channel])
      if (texts) display[channel] = texts
    }
  }

  return {
    minDaysBefore,
    maxDaysBefore: typeof row.maxDaysBefore === 'number' ? row.maxDaysBefore : null,
    chargePercent,
    label,
    display: Object.keys(display).length > 0 ? display : undefined,
  }
}

function defaultScopesForRuleSet(
  id: string,
  condition: CancellationRuleSetCondition
): CancellationServiceScope[] {
  if (id === 'standard_katzen') return ['katzenbetreuung']
  if (condition.type === 'school_holidays_bw' || id === 'standard' || id === 'school_holidays_bw') {
    return ['hundepension', 'tagesbetreuung']
  }
  return ['hundepension', 'tagesbetreuung']
}

function normalizeServiceScopes(value: unknown, ruleSetId: string, condition: CancellationRuleSetCondition) {
  if (!Array.isArray(value)) return defaultScopesForRuleSet(ruleSetId, condition)
  const scopes = value.filter(
    (item): item is CancellationServiceScope =>
      item === 'hundepension' || item === 'katzenbetreuung' || item === 'tagesbetreuung'
  )
  return scopes.length > 0 ? scopes : defaultScopesForRuleSet(ruleSetId, condition)
}

function normalizeSectionTitles(value: unknown): CancellationPolicyRuleSet['sectionTitles'] {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const out: NonNullable<CancellationPolicyRuleSet['sectionTitles']> = {}
  for (const channel of ['landing', 'contract', 'portal'] as const) {
    if (typeof row[channel] === 'string') out[channel] = row[channel]
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function normalizeRuleSet(value: unknown): CancellationPolicyRuleSet | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  const priority = typeof row.priority === 'number' ? row.priority : 0
  const tiers = Array.isArray(row.tiers)
    ? row.tiers.map(normalizeTier).filter((tier): tier is CancellationPolicyTier => tier !== null)
    : []
  if (!id || !name || tiers.length === 0) return null

  const conditionRaw = row.condition as Record<string, unknown> | undefined
  const conditionType = conditionRaw?.type
  const condition: CancellationRuleSetCondition =
    conditionType === 'school_holidays_bw'
      ? { type: 'school_holidays_bw' }
      : { type: 'default' }

  const notes = Array.isArray(row.notes)
    ? row.notes.filter((note): note is string => typeof note === 'string')
    : []

  return {
    id,
    name,
    condition,
    priority,
    serviceScopes: normalizeServiceScopes(row.serviceScopes, id, condition),
    sectionTitles: normalizeSectionTitles(row.sectionTitles),
    tiers,
    notes,
  }
}

function normalizeDisplayTitles(value: unknown): CancellationPolicyConfig['displayTitles'] {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const landingRaw = row.landing
  const landing =
    landingRaw && typeof landingRaw === 'object'
      ? {
          hundepension:
            typeof (landingRaw as Record<string, unknown>).hundepension === 'string'
              ? ((landingRaw as Record<string, unknown>).hundepension as string)
              : undefined,
          katzenbetreuung:
            typeof (landingRaw as Record<string, unknown>).katzenbetreuung === 'string'
              ? ((landingRaw as Record<string, unknown>).katzenbetreuung as string)
              : undefined,
        }
      : undefined

  return {
    landing,
    portal: typeof row.portal === 'string' ? row.portal : undefined,
    contract: typeof row.contract === 'string' ? row.contract : undefined,
  }
}

export function normalizeCancellationPolicyConfig(
  value: unknown,
  fallback: CancellationPolicyConfig = DEFAULT_CANCELLATION_POLICY_CONFIG
): CancellationPolicyConfig {
  if (!value || typeof value !== 'object') return fallback
  const row = value as Record<string, unknown>

  const ruleSets = Array.isArray(row.ruleSets)
    ? row.ruleSets.map(normalizeRuleSet).filter((set): set is CancellationPolicyRuleSet => set !== null)
    : []

  const generalNotes = Array.isArray(row.generalNotes)
    ? row.generalNotes.filter((note): note is string => typeof note === 'string')
    : fallback.generalNotes

  return {
    title: typeof row.title === 'string' && row.title.trim() ? row.title : fallback.title,
    displayTitles: normalizeDisplayTitles(row.displayTitles) ?? fallback.displayTitles,
    cutoffHour:
      typeof row.cutoffHour === 'number' && row.cutoffHour >= 0 && row.cutoffHour <= 23
        ? row.cutoffHour
        : fallback.cutoffHour,
    generalNotes,
    ruleSets: ruleSets.length > 0 ? ruleSets : fallback.ruleSets,
  }
}

export function emptyCancellationPolicyTier(): CancellationPolicyTier {
  return { minDaysBefore: 0, maxDaysBefore: null, chargePercent: 0, label: '' }
}

export function emptyCancellationPolicyRuleSet(): CancellationPolicyRuleSet {
  return {
    id: `ruleset_${Date.now()}`,
    name: '',
    condition: { type: 'default' },
    priority: 0,
    serviceScopes: ['hundepension', 'tagesbetreuung'],
    tiers: [emptyCancellationPolicyTier()],
    notes: [],
  }
}

/** @deprecated Nutze policyToCancellationSections aus cancellation-policy-display */
export function configToDisplaySections(config: CancellationPolicyConfig) {
  return config.ruleSets.map((ruleSet) => ({
    title: ruleSet.sectionTitles?.contract ?? (ruleSet.condition.type === 'school_holidays_bw' ? ruleSet.name : ''),
    policy: ruleSet.tiers.map((tier) => ({
      period: tier.label,
      refund: refundTextFromChargePercent(tier.chargePercent, 'contract'),
    })),
    notes: ruleSet.notes ?? [],
  }))
}

export function validateCancellationPolicyConfig(config: CancellationPolicyConfig): string | null {
  if (!config.title.trim()) return 'Titel ist erforderlich.'
  if (config.ruleSets.length === 0) return 'Mindestens ein Regelwerk ist erforderlich.'

  for (const ruleSet of config.ruleSets) {
    if (!ruleSet.id.trim() || !ruleSet.name.trim()) {
      return 'Jedes Regelwerk braucht ID und Name.'
    }
    if (ruleSet.serviceScopes.length === 0) {
      return `Regelwerk "${ruleSet.name}" braucht mindestens eine Betreuungsart.`
    }
    if (ruleSet.tiers.length === 0) {
      return `Regelwerk "${ruleSet.name}" braucht mindestens eine Staffel.`
    }
    for (const tier of ruleSet.tiers) {
      if (tier.minDaysBefore < 0) return 'Fristen dürfen nicht negativ sein.'
      if (tier.chargePercent < 0 || tier.chargePercent > 100) {
        return 'Storno-Anteil muss zwischen 0 und 100 liegen.'
      }
      if (!tier.label.trim()) return 'Jede Staffel braucht ein Anzeige-Label.'
    }
  }

  return null
}
