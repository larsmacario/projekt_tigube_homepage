export type CancellationRuleSetCondition =
  | { type: 'default' }
  | { type: 'school_holidays_bw' }

export interface CancellationPolicyTier {
  minDaysBefore: number
  maxDaysBefore: number | null
  chargePercent: number
  label: string
}

export interface CancellationPolicyRuleSet {
  id: string
  name: string
  condition: CancellationRuleSetCondition
  priority: number
  tiers: CancellationPolicyTier[]
  notes?: string[]
}

export interface CancellationPolicyConfig {
  title: string
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

export const DEFAULT_CANCELLATION_POLICY_CONFIG: CancellationPolicyConfig = {
  title: 'Stornierungsbedingungen',
  cutoffHour: 18,
  generalNotes: [
    'Absagen werden jeweils bis 18 Uhr berücksichtigt – auch an Sonn-/Feiertagen oder in Betriebsferien.',
    'Die Stornierung erfolgt über das Kundenportal in schriftlicher Form.',
  ],
  ruleSets: [
    {
      id: 'standard',
      name: 'Standard',
      condition: { type: 'default' },
      priority: 0,
      tiers: [
        { minDaysBefore: 15, maxDaysBefore: null, chargePercent: 0, label: '15 Tage und mehr vor Check-In' },
        { minDaysBefore: 7, maxDaysBefore: 14, chargePercent: 50, label: '14 - 7 Tage vor Check-In' },
        { minDaysBefore: 0, maxDaysBefore: 6, chargePercent: 100, label: '6 Tage und weniger vor Check-In' },
      ],
      notes: [],
    },
    {
      id: 'school_holidays_bw',
      name: 'Schulferien Baden-Württemberg',
      condition: { type: 'school_holidays_bw' },
      priority: 10,
      tiers: [
        { minDaysBefore: 56, maxDaysBefore: null, chargePercent: 0, label: '56 Tage und mehr vor Check-In' },
        { minDaysBefore: 21, maxDaysBefore: 55, chargePercent: 50, label: '55 - 21 Tage vor Check-In' },
        { minDaysBefore: 0, maxDaysBefore: 20, chargePercent: 100, label: '20 Tage und weniger vor Check-In' },
      ],
      notes: [],
    },
  ],
}

function normalizeTier(value: unknown): CancellationPolicyTier | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const minDaysBefore = typeof row.minDaysBefore === 'number' ? row.minDaysBefore : null
  const chargePercent = typeof row.chargePercent === 'number' ? row.chargePercent : null
  const label = typeof row.label === 'string' ? row.label : ''
  if (minDaysBefore == null || chargePercent == null) return null
  return {
    minDaysBefore,
    maxDaysBefore: typeof row.maxDaysBefore === 'number' ? row.maxDaysBefore : null,
    chargePercent,
    label,
  }
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

  return { id, name, condition, priority, tiers, notes }
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
    tiers: [emptyCancellationPolicyTier()],
    notes: [],
  }
}

export function configToDisplaySections(config: CancellationPolicyConfig) {
  return config.ruleSets.map((ruleSet) => ({
    title: ruleSet.condition.type === 'school_holidays_bw' ? ruleSet.name : '',
    policy: ruleSet.tiers.map((tier) => ({
      period: tier.label,
      refund:
        tier.chargePercent === 0
          ? 'kostenlos'
          : tier.chargePercent === 100
            ? '100% der Buchungssumme'
            : `${tier.chargePercent}% der Buchungssumme`,
    })),
    notes: ruleSet.notes ?? [],
  }))
}
