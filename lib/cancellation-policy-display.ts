import type { CancellationSection } from '@/lib/cms/cancellation-policy'
import {
  type CancellationDisplayChannel,
  type CancellationPolicyConfig,
  type CancellationPolicyRuleSet,
  type CancellationPolicyTier,
  type CancellationServiceScope,
  refundTextFromChargePercent,
} from '@/lib/cancellation-policy-config'
import type { ServiceType } from '@/lib/types'

export type { CancellationDisplayChannel, CancellationServiceScope }

export function serviceTypeToScope(serviceType: ServiceType | null | undefined): CancellationServiceScope {
  if (serviceType === 'katzenbetreuung') return 'katzenbetreuung'
  if (serviceType === 'tagesbetreuung') return 'tagesbetreuung'
  return 'hundepension'
}

export function ruleSetAppliesToService(
  ruleSet: CancellationPolicyRuleSet,
  scope: CancellationServiceScope
): boolean {
  const scopes = ruleSet.serviceScopes?.length
    ? ruleSet.serviceScopes
    : (['hundepension', 'tagesbetreuung'] as CancellationServiceScope[])
  return scopes.includes(scope)
}

export function filterConfigForService(
  config: CancellationPolicyConfig,
  scope: CancellationServiceScope
): CancellationPolicyConfig {
  return {
    ...config,
    ruleSets: config.ruleSets.filter((ruleSet) => ruleSetAppliesToService(ruleSet, scope)),
  }
}

export function getTierDisplayTexts(
  tier: CancellationPolicyTier,
  channel: CancellationDisplayChannel
): { period: string; refund: string } {
  const fromDisplay = tier.display?.[channel]
  if (fromDisplay?.period || fromDisplay?.refund) {
    return {
      period: fromDisplay.period ?? tier.label,
      refund: fromDisplay.refund ?? refundTextFromChargePercent(tier.chargePercent, channel),
    }
  }
  return {
    period: tier.label,
    refund: refundTextFromChargePercent(tier.chargePercent, channel),
  }
}

export function getPolicyDisplayTitle(
  config: CancellationPolicyConfig,
  scope: CancellationServiceScope,
  channel: CancellationDisplayChannel
): string {
  if (channel === 'portal') {
    return config.displayTitles?.portal ?? config.title
  }
  if (channel === 'contract') {
    return config.displayTitles?.contract ?? 'Stornierung'
  }
  if (scope === 'katzenbetreuung') {
    return config.displayTitles?.landing?.katzenbetreuung ?? config.title
  }
  return config.displayTitles?.landing?.hundepension ?? config.title
}

export function policyToCancellationSections(
  config: CancellationPolicyConfig,
  scope: CancellationServiceScope,
  channel: CancellationDisplayChannel
): CancellationSection[] {
  const scoped = filterConfigForService(config, scope)
  const sorted = [...scoped.ruleSets].sort((a, b) => a.priority - b.priority)

  return sorted.map((ruleSet) => {
    const title = ruleSet.sectionTitles?.[channel] ?? ''
    return {
      title,
      policy: ruleSet.tiers.map((tier) => {
        const texts = getTierDisplayTexts(tier, channel)
        return { period: texts.period, refund: texts.refund }
      }),
      notes: ruleSet.notes ?? [],
    }
  })
}

export function appendPolicyVersionNotice(
  html: string,
  version: number | null | undefined,
  updatedAt: string | null | undefined
): string {
  if (version == null) return html
  const dateLabel = updatedAt
    ? new Date(updatedAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : ''
  const stand = dateLabel
    ? `Stand der Stornierungsbedingungen: Version ${version} (${dateLabel})`
    : `Stand der Stornierungsbedingungen: Version ${version}`
  return `${html.trim()}\n<p><em>${stand}</em></p>`
}
