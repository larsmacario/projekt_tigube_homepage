import { getCMSContent } from '@/lib/cms'
import { getLegalContent } from '@/lib/cms/legal-defaults'

export type BetreuungsvertragLegal = {
  title: string
  content: string
}

/** Server: CMS `agb` mit Fallback wie `/agb`. */
export async function getBetreuungsvertragLegal(): Promise<BetreuungsvertragLegal> {
  const data = await getCMSContent('agb')
  return getLegalContent(data, 'agb')
}

/** Client/API: gleiche Auflösung aus Roh-CMS-Daten (`/api/cms?key=agb`). */
export function resolveBetreuungsvertragLegal(
  cmsData: { title?: string; content?: string } | null | undefined
): BetreuungsvertragLegal {
  return getLegalContent(cmsData ?? null, 'agb')
}
