import { getCMSContent } from '@/lib/cms'
import { getLegalContent } from '@/lib/cms/legal-defaults'
import {
  appendPolicyVersionNotice,
  policyToCancellationSections,
} from '@/lib/cancellation-policy-display'
import { getAdminDbClient } from '@/lib/admin-auth'
import {
  DEFAULT_CANCELLATION_POLICY_CONFIG,
  type CancellationPolicyConfig,
} from '@/lib/cancellation-policy-config'
import { loadActiveCancellationPolicy } from '@/lib/cancellation-policy-loader'
import {
  injectCancellationPolicyIntoContract,
  renderCancellationSectionsToHtml,
} from '@/lib/cms/cancellation-policy'

export type BetreuungsvertragLegal = {
  title: string
  content: string
  cancellationPolicyVersion?: number | null
}

export type BetreuungsvertragPolicyInput = {
  config: CancellationPolicyConfig
  version?: number | null
  updatedAt?: string | null
}

function buildContractContent(
  baseContent: string,
  policyInput: BetreuungsvertragPolicyInput
): string {
  const sections = policyToCancellationSections(
    policyInput.config,
    'hundepension',
    'contract'
  )
  const cancellationHtml = renderCancellationSectionsToHtml(
    sections,
    policyInput.config.generalNotes
  )
  const withVersion = appendPolicyVersionNotice(
    cancellationHtml,
    policyInput.version ?? null,
    policyInput.updatedAt ?? null
  )
  return injectCancellationPolicyIntoContract(baseContent, withVersion)
}

function resolvePolicyInput(
  policyResult?:
    | Awaited<ReturnType<typeof loadActiveCancellationPolicy>>
    | BetreuungsvertragPolicyInput
    | null
): BetreuungsvertragPolicyInput {
  if (!policyResult) {
    return { config: DEFAULT_CANCELLATION_POLICY_CONFIG, version: null, updatedAt: null }
  }
  if ('policy' in policyResult) {
    return {
      config: policyResult.config,
      version: policyResult.policy?.version ?? null,
      updatedAt: policyResult.policy?.updated_at ?? null,
    }
  }
  return {
    config: policyResult.config,
    version: policyResult.version ?? null,
    updatedAt: policyResult.updatedAt ?? null,
  }
}

/** Server: CMS `agb` mit aktuellen Stornobedingungen aus der zentralen Policy. */
export async function getBetreuungsvertragLegal(): Promise<BetreuungsvertragLegal> {
  const [agbData, policyResult] = await Promise.all([
    getCMSContent('agb'),
    loadActiveCancellationPolicy(getAdminDbClient()),
  ])
  return resolveBetreuungsvertragLegal(agbData, policyResult)
}

/** Client/API: gleiche Auflösung aus Roh-CMS-Daten und optional Policy-Ergebnis. */
export function resolveBetreuungsvertragLegal(
  cmsData: { title?: string; content?: string } | null | undefined,
  policyResult?:
    | Awaited<ReturnType<typeof loadActiveCancellationPolicy>>
    | BetreuungsvertragPolicyInput
    | null
): BetreuungsvertragLegal {
  const baseLegal = getLegalContent(cmsData ?? null, 'agb')
  const resolved = resolvePolicyInput(policyResult)
  const content = buildContractContent(baseLegal.content, resolved)

  return {
    title: baseLegal.title,
    content,
    cancellationPolicyVersion: resolved.version ?? null,
  }
}
