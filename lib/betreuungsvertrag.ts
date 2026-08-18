import { getCMSContent } from '@/lib/cms'
import { getLegalContent } from '@/lib/cms/legal-defaults'
import {
  defaultCancellationGeneralNotes,
  defaultPortalCancellationSections,
  injectCancellationPolicyIntoContract,
  normalizeCancellationSections,
  renderCancellationSectionsToHtml,
  type CancellationSection,
} from '@/lib/cms/cancellation-policy'

export type BetreuungsvertragLegal = {
  title: string
  content: string
}

export type BetreuungsvertragPortalCms = {
  cancellationSections?: CancellationSection[]
  cancellationNotes?: string[]
}

/** Server: CMS `agb` mit aktuellen Stornobedingungen aus `kundenportal` synchronisiert. */
export async function getBetreuungsvertragLegal(): Promise<BetreuungsvertragLegal> {
  const [agbData, portalData] = await Promise.all([
    getCMSContent('agb'),
    getCMSContent('kundenportal'),
  ])
  return resolveBetreuungsvertragLegal(agbData, portalData)
}

/** Client/API: gleiche Auflösung aus Roh-CMS-Daten (`/api/cms?key=agb` und optional `kundenportal`). */
export function resolveBetreuungsvertragLegal(
  cmsData: { title?: string; content?: string } | null | undefined,
  portalData?: BetreuungsvertragPortalCms | null | undefined
): BetreuungsvertragLegal {
  const baseLegal = getLegalContent(cmsData ?? null, 'agb')

  const sections = normalizeCancellationSections(portalData, defaultPortalCancellationSections)
  const notes =
    Array.isArray(portalData?.cancellationNotes) && portalData.cancellationNotes.length > 0
      ? portalData.cancellationNotes
      : defaultCancellationGeneralNotes

  const cancellationHtml = renderCancellationSectionsToHtml(sections, notes)
  const content = injectCancellationPolicyIntoContract(baseLegal.content, cancellationHtml)

  return {
    title: baseLegal.title,
    content,
  }
}

