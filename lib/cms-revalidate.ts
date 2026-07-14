import { revalidatePath } from 'next/cache'

export const CMS_REVALIDATE_PATHS: Record<string, string[]> = {
  homepage: ['/'],
  hundepension: ['/hundepension'],
  katzenbetreuung: ['/katzenbetreuung'],
  impressum: ['/impressum'],
  datenschutz: ['/datenschutz'],
  agb: ['/agb'],
}

export function revalidateCMSPaths(key: string) {
  for (const path of CMS_REVALIDATE_PATHS[key] || []) {
    revalidatePath(path)
  }
}
