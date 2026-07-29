import type { LegalPageKey } from '@/lib/cms/legal-defaults'

export const RECHTLICHES_NOINDEX = {
  robots: { index: false as const, follow: true as const },
}

export type RechtlichesLink = {
  href: string
  cmsKey: LegalPageKey
  /** Fallback label if CMS title empty */
  label: string
}

export const RECHTLICHES_LINKS: RechtlichesLink[] = [
  {
    href: '/rechtliches/betreuungsvertrag',
    cmsKey: 'agb',
    label: 'AGB',
  },
  {
    href: '/rechtliches/datenschutz',
    cmsKey: 'datenschutz',
    label: 'Datenschutzerklärung',
  },
  {
    href: '/rechtliches/impressum',
    cmsKey: 'impressum',
    label: 'Impressum',
  },
]

export const RECHTLICHES_CANONICAL: Record<LegalPageKey, string> = {
  agb: '/agb',
  datenschutz: '/datenschutz',
  impressum: '/impressum',
}
