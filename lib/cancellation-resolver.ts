import type { CancellationPolicyConfig, CancellationPolicyRuleSet, CancellationPolicyTier } from '@/lib/cancellation-policy-config'
import { filterConfigForService, serviceTypeToScope } from '@/lib/cancellation-policy-display'
import type { ServiceType } from '@/lib/types'
import {
  bookingOverlapsSchoolHolidaysBw,
  datesOverlapSchoolHolidaysBw,
  isDateInSchoolHolidaysBw,
  type SchoolHolidayPeriod,
} from '@/lib/school-holidays-bw'
import {
  BOOKING_CALENDAR_TIME_ZONE,
  parseIsoDate,
  startOfDay,
  toIsoDate,
} from '@/lib/vacation-dates'

export interface CancellationCalculationInput {
  checkInDate: string
  bookingStartDate: string
  bookingEndDate: string | null
  selectedDates?: string[] | null
  cancelledDates?: string[] | null
  cancellationAt: Date
  bookingTotal: number
  /** Wenn gesetzt, wird diese Summe statt Ratio/Gesamt genutzt (z. B. Tagespreis × Tage). */
  scopeTotalOverride?: number
  policy: CancellationPolicyConfig
  serviceType?: ServiceType | null
  schoolHolidays: SchoolHolidayPeriod[]
}

export interface CancellationCalculationResult {
  ruleSetId: string
  ruleSetName: string
  tierLabel: string
  chargePercent: number
  daysBeforeCheckIn: number
  effectiveCancellationDate: string
  scopeTotal: number
  cancellationChargeAmount: number
  cancellationRefundAmount: number
  policySnapshot: CancellationPolicyConfig
  /** Mehrere Staffeln über die stornierten Tage verteilt. */
  mixedTierLabels?: boolean
}

export type CancellationPerDayAmount = {
  date: string
  amount: number
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function berlinWallClock(date: Date): { isoDate: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_CALENDAR_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = Number.parseInt(get('hour'), 10)

  return { isoDate: `${year}-${month}-${day}`, hour }
}

export function effectiveCancellationDate(
  cancellationAt: Date,
  cutoffHour: number
): string {
  const { isoDate, hour } = berlinWallClock(cancellationAt)
  if (hour >= cutoffHour) {
    const parsed = parseIsoDate(isoDate)
    if (!parsed) return isoDate
    parsed.setDate(parsed.getDate() + 1)
    return toIsoDate(startOfDay(parsed))
  }
  return isoDate
}

export function daysBeforeCheckIn(
  effectiveDateIso: string,
  checkInDateIso: string
): number {
  const effective = startOfDay(parseIsoDate(effectiveDateIso) ?? new Date(effectiveDateIso))
  const checkIn = startOfDay(parseIsoDate(checkInDateIso) ?? new Date(checkInDateIso))
  const diffMs = checkIn.getTime() - effective.getTime()
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}

export function findMatchingTier(
  tiers: CancellationPolicyTier[],
  daysBefore: number
): CancellationPolicyTier {
  const sorted = [...tiers].sort((a, b) => b.minDaysBefore - a.minDaysBefore)
  for (const tier of sorted) {
    if (daysBefore >= tier.minDaysBefore) {
      if (tier.maxDaysBefore == null || daysBefore <= tier.maxDaysBefore) {
        return tier
      }
    }
  }
  return sorted.reduce((worst, tier) =>
    tier.chargePercent > worst.chargePercent ? tier : worst
  )
}

export function selectRuleSetForCancelledDate(
  config: CancellationPolicyConfig,
  cancelledDateIso: string,
  schoolHolidays: SchoolHolidayPeriod[],
  serviceType?: ServiceType | null
): CancellationPolicyRuleSet {
  const scoped = filterConfigForService(config, serviceTypeToScope(serviceType))
  if (isDateInSchoolHolidaysBw(cancelledDateIso, schoolHolidays)) {
    const school = scoped.ruleSets.find(
      (ruleSet) => ruleSet.condition.type === 'school_holidays_bw'
    )
    if (school) return school
  }
  return (
    scoped.ruleSets.find((ruleSet) => ruleSet.condition.type === 'default') ??
    scoped.ruleSets[0]
  )
}

export function selectRuleSet(
  config: CancellationPolicyConfig,
  bookingStartDate: string,
  bookingEndDate: string | null,
  selectedDates: string[] | null | undefined,
  schoolHolidays: SchoolHolidayPeriod[]
): CancellationPolicyRuleSet {
  const applicable = config.ruleSets
    .filter((ruleSet) => {
      if (ruleSet.condition.type !== 'school_holidays_bw') return false
      if (selectedDates?.length) {
        return datesOverlapSchoolHolidaysBw(selectedDates, schoolHolidays)
      }
      return bookingOverlapsSchoolHolidaysBw(
        bookingStartDate,
        bookingEndDate,
        schoolHolidays
      )
    })
    .sort((a, b) => b.priority - a.priority)

  if (applicable.length > 0) return applicable[0]

  return (
    config.ruleSets.find((ruleSet) => ruleSet.condition.type === 'default') ??
    config.ruleSets[0]
  )
}

function resolveScopeTotal(input: CancellationCalculationInput): {
  scopeTotal: number
  checkInDate: string
} {
  if (input.scopeTotalOverride != null) {
    return {
      scopeTotal: roundMoney(input.scopeTotalOverride),
      checkInDate: input.checkInDate,
    }
  }

  const cancelled = new Set(input.cancelledDates ?? [])
  const selected = input.selectedDates ?? []

  if (selected.length > 0 && cancelled.size > 0) {
    const cancelCount = selected.filter((date) => cancelled.has(date)).length
    if (cancelCount === 0) {
      return { scopeTotal: input.bookingTotal, checkInDate: input.checkInDate }
    }
    const ratio = cancelCount / Math.max(selected.length, 1)
    const earliestCancelled = [...cancelled].sort()[0]
    return {
      scopeTotal: roundMoney(input.bookingTotal * ratio),
      checkInDate: earliestCancelled,
    }
  }

  return { scopeTotal: input.bookingTotal, checkInDate: input.checkInDate }
}

export function calculateCancellationAmountsForDates(
  input: CancellationCalculationInput & {
    perDayAmounts: CancellationPerDayAmount[]
  }
): CancellationCalculationResult {
  const scopedPolicy = filterConfigForService(
    input.policy,
    serviceTypeToScope(input.serviceType)
  )
  const effectiveDate = effectiveCancellationDate(
    input.cancellationAt,
    scopedPolicy.cutoffHour
  )

  let totalScope = 0
  let totalCharge = 0
  const tierLabels = new Set<string>()
  const ruleSetNames = new Set<string>()
  const ruleSetIds = new Set<string>()
  let minDaysBefore = Number.POSITIVE_INFINITY

  for (const row of input.perDayAmounts) {
    if (row.amount <= 0) continue
    totalScope += row.amount
    const ruleSet = selectRuleSetForCancelledDate(
      scopedPolicy,
      row.date,
      input.schoolHolidays,
      input.serviceType
    )
    ruleSetIds.add(ruleSet.id)
    ruleSetNames.add(ruleSet.name)
    const daysBefore = daysBeforeCheckIn(effectiveDate, row.date)
    minDaysBefore = Math.min(minDaysBefore, daysBefore)
    const tier = findMatchingTier(ruleSet.tiers, daysBefore)
    tierLabels.add(tier.label)
    totalCharge += roundMoney((row.amount * tier.chargePercent) / 100)
  }

  totalScope = roundMoney(totalScope)
  totalCharge = roundMoney(totalCharge)
  const refundAmount = roundMoney(totalScope - totalCharge)
  const chargePercent =
    totalScope > 0 ? roundMoney((totalCharge / totalScope) * 100) : 0

  const mixedTierLabels = tierLabels.size > 1
  const tierLabel = mixedTierLabels
    ? `Je Betreuungstag (${[...tierLabels].join('; ')})`
    : [...tierLabels][0] ?? ''

  const ruleSetId = ruleSetIds.has('school_holidays_bw')
    ? 'school_holidays_bw'
    : [...ruleSetIds][0] ?? 'standard'
  const ruleSetName =
    ruleSetIds.has('school_holidays_bw') && ruleSetIds.size > 1
      ? 'Schulferien / Standard (gemischt)'
      : [...ruleSetNames][0] ?? ''

  return {
    ruleSetId,
    ruleSetName,
    tierLabel,
    chargePercent,
    daysBeforeCheckIn: Number.isFinite(minDaysBefore) ? minDaysBefore : 0,
    effectiveCancellationDate: effectiveDate,
    scopeTotal: totalScope,
    cancellationChargeAmount: totalCharge,
    cancellationRefundAmount: refundAmount,
    policySnapshot: scopedPolicy,
    mixedTierLabels,
  }
}

export function calculateCancellationAmounts(
  input: CancellationCalculationInput
): CancellationCalculationResult {
  const scopedPolicy = filterConfigForService(
    input.policy,
    serviceTypeToScope(input.serviceType)
  )
  const ruleSet = selectRuleSet(
    scopedPolicy,
    input.bookingStartDate,
    input.bookingEndDate,
    input.selectedDates,
    input.schoolHolidays
  )

  const effectiveDate = effectiveCancellationDate(
    input.cancellationAt,
    scopedPolicy.cutoffHour
  )
  const { scopeTotal, checkInDate } = resolveScopeTotal(input)
  const daysBefore = daysBeforeCheckIn(effectiveDate, checkInDate)
  const tier = findMatchingTier(ruleSet.tiers, daysBefore)
  const chargeAmount = roundMoney((scopeTotal * tier.chargePercent) / 100)
  const refundAmount = roundMoney(scopeTotal - chargeAmount)

  return {
    ruleSetId: ruleSet.id,
    ruleSetName: ruleSet.name,
    tierLabel: tier.label,
    chargePercent: tier.chargePercent,
    daysBeforeCheckIn: daysBefore,
    effectiveCancellationDate: effectiveDate,
    scopeTotal,
    cancellationChargeAmount: chargeAmount,
    cancellationRefundAmount: refundAmount,
    policySnapshot: scopedPolicy,
  }
}
