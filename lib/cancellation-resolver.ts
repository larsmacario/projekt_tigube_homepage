import type { CancellationPolicyConfig, CancellationPolicyRuleSet, CancellationPolicyTier } from '@/lib/cancellation-policy-config'
import {
  bookingOverlapsSchoolHolidaysBw,
  datesOverlapSchoolHolidaysBw,
  type SchoolHolidayPeriod,
} from '@/lib/school-holidays-bw'
import { startOfDay, toIsoDate } from '@/lib/vacation-dates'

export interface CancellationCalculationInput {
  checkInDate: string
  bookingStartDate: string
  bookingEndDate: string | null
  selectedDates?: string[] | null
  cancelledDates?: string[] | null
  cancellationAt: Date
  bookingTotal: number
  policy: CancellationPolicyConfig
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
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function effectiveCancellationDate(
  cancellationAt: Date,
  cutoffHour: number
): string {
  const local = new Date(cancellationAt)
  if (local.getHours() >= cutoffHour) {
    local.setDate(local.getDate() + 1)
  }
  return toIsoDate(startOfDay(local))
}

export function daysBeforeCheckIn(
  effectiveDateIso: string,
  checkInDateIso: string
): number {
  const effective = startOfDay(new Date(effectiveDateIso))
  const checkIn = startOfDay(new Date(checkInDateIso))
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
  const cancelled = new Set(input.cancelledDates ?? [])
  const selected = input.selectedDates ?? []

  if (selected.length > 0 && cancelled.size > 0) {
    const activeCount = selected.filter((date) => !cancelled.has(date)).length
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

export function calculateCancellationAmounts(
  input: CancellationCalculationInput
): CancellationCalculationResult {
  const ruleSet = selectRuleSet(
    input.policy,
    input.bookingStartDate,
    input.bookingEndDate,
    input.selectedDates,
    input.schoolHolidays
  )

  const effectiveDate = effectiveCancellationDate(
    input.cancellationAt,
    input.policy.cutoffHour
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
    policySnapshot: input.policy,
  }
}
