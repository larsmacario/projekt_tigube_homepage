export const MAX_IMPFASS_PHOTOS = 10

export const IMPFPASS_PAGE_CATEGORIES = [
  'angaben_tier_besitzer',
  'kennzeichnung',
  'impfung',
  'sonstiges',
] as const

export type ImpfpassPageCategory = (typeof IMPFPASS_PAGE_CATEGORIES)[number]

export const DEFAULT_IMPFASS_PAGE_CATEGORY: ImpfpassPageCategory = 'sonstiges'

export type ImpfpassExampleImage = {
  category: ImpfpassPageCategory
  label: string
  src: string
  hint: string
}

export const IMPFPASS_EXAMPLE_IMAGES: ImpfpassExampleImage[] = [
  {
    category: 'angaben_tier_besitzer',
    label: 'Angaben zum Tier & Besitzer',
    src: '/Heimtierausweis/angaben-tier-besitzer.jpeg',
    hint: 'Fotografiere die Seiten mit Tierbeschreibung und Besitzerdaten – gut lesbar und ohne Spiegelungen.',
  },
  {
    category: 'kennzeichnung',
    label: 'Kennzeichnung des Tieres',
    src: '/Heimtierausweis/kennzeichnung-eintragen.jpeg',
    hint: 'Chip-/Transponder-Seite vollständig und scharf abbilden, inkl. Datum und Stelle.',
  },
  {
    category: 'impfung',
    label: 'Impfung (z. B. Tollwut)',
    src: '/Heimtierausweis/impfung-eintragen.jpeg',
    hint: 'Impfeinträge mit Datum, Chargennummer und Tierarzt-Stempel gut erkennbar fotografieren.',
  },
]

export const IMPFPASS_CATEGORY_LABELS: Record<ImpfpassPageCategory, string> = {
  angaben_tier_besitzer: 'Angaben zum Tier & Besitzer',
  kennzeichnung: 'Kennzeichnung des Tieres',
  impfung: 'Impfung',
  sonstiges: 'Sonstige Seite',
}

export function isImpfpassPageCategory(value: string): value is ImpfpassPageCategory {
  return (IMPFPASS_PAGE_CATEGORIES as readonly string[]).includes(value)
}

export function normalizeImpfpassPageCategory(
  value: string | null | undefined
): ImpfpassPageCategory {
  if (value && isImpfpassPageCategory(value)) {
    return value
  }
  return DEFAULT_IMPFASS_PAGE_CATEGORY
}

export function getImpfpassCategoryLabel(category: string | null | undefined): string {
  if (category && isImpfpassPageCategory(category)) {
    return IMPFPASS_CATEGORY_LABELS[category]
  }
  return IMPFPASS_CATEGORY_LABELS.sonstiges
}
