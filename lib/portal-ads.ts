export type AdFormatPlacement = 'sidebar'

/** Sidebar-Breite im Portal: 16rem ≈ 256 px (ohne Padding). */
export const SIDEBAR_CONTENT_WIDTH_PX = 256

export const SIDEBAR_AD_FORMAT = {
  slug: 'sidebar',
  name: 'Sidebar',
  width_px: SIDEBAR_CONTENT_WIDTH_PX,
  height_px: 128,
  placement: 'sidebar' as AdFormatPlacement,
}

export type SidebarAdFormatRecommendation = {
  label: string
  width_px: number
  height_px: number
  aspect_ratio: string
  description: string
  recommended?: boolean
}

/** Empfohlene Bildformate für die Kundenportal-Sidebar. */
export const SIDEBAR_AD_FORMAT_RECOMMENDATIONS: SidebarAdFormatRecommendation[] = [
  {
    label: 'Standard-Banner',
    width_px: 256,
    height_px: 128,
    aspect_ratio: '2:1',
    description:
      'Beste Wahl für Werbebotschaften mit Text und Logo. Entspricht der Sidebar-Breite und wirkt ausgewogen.',
    recommended: true,
  },
  {
    label: 'Quadrat',
    width_px: 256,
    height_px: 256,
    aspect_ratio: '1:1',
    description:
      'Ideal für Produktfotos, Angebots-Grafiken oder quadratische Social-Media-Bilder. Nimmt mehr Höhe ein.',
  },
  {
    label: 'Foto-Format',
    width_px: 256,
    height_px: 192,
    aspect_ratio: '4:3',
    description:
      'Klassisches Fotoverhältnis für emotionale Motive oder Tierfotos. Etwas höher als das Standard-Banner.',
  },
  {
    label: 'Kompakt',
    width_px: 256,
    height_px: 96,
    aspect_ratio: '8:3',
    description:
      'Schmaler Streifen mit wenig Höhe – dezent neben der Navigation, gut für kurze Hinweise.',
  },
]

export type AdLinkTarget = '_self' | '_blank'

export type AdFormat = {
  id: string
  name: string
  slug: string
  width_px: number
  height_px: number
  placement: AdFormatPlacement
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export type PortalAd = {
  id: string
  format_id: string
  title: string
  image_url: string
  link_url: string | null
  link_target: AdLinkTarget
  sort_order: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at?: string
  updated_at?: string
  ad_formats?: AdFormat | AdFormat[] | null
}

export type AdRotationSettings = {
  id: string
  interval_seconds: number
  is_enabled: boolean
  created_at?: string
  updated_at?: string
}

export type PortalAdsPayload = {
  formats: AdFormat[]
  ads: PortalAd[]
  settings: AdRotationSettings | null
}

const MIN_INTERVAL_SECONDS = 3
const MAX_INTERVAL_SECONDS = 60
const DEFAULT_INTERVAL_SECONDS = 8

export function clampIntervalSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_INTERVAL_SECONDS
  }
  return Math.min(MAX_INTERVAL_SECONDS, Math.max(MIN_INTERVAL_SECONDS, Math.round(value)))
}

export function isValidLinkTarget(value: unknown): value is AdLinkTarget {
  return value === '_self' || value === '_blank'
}

export function isAdWithinSchedule(ad: PortalAd, now = new Date()): boolean {
  if (ad.starts_at) {
    const startsAt = new Date(ad.starts_at)
    if (!Number.isNaN(startsAt.getTime()) && startsAt > now) {
      return false
    }
  }

  if (ad.ends_at) {
    const endsAt = new Date(ad.ends_at)
    if (!Number.isNaN(endsAt.getTime()) && endsAt < now) {
      return false
    }
  }

  return true
}

export function filterActiveAds(ads: PortalAd[], now = new Date()): PortalAd[] {
  return ads
    .filter((ad) => ad.is_active && isAdWithinSchedule(ad, now))
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'de'))
}

export function filterActiveFormats(formats: AdFormat[]): AdFormat[] {
  return formats
    .filter((format) => format.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'de'))
}

export function getFormatFromAd(ad: PortalAd): AdFormat | null {
  if (!ad.ad_formats) return null
  if (Array.isArray(ad.ad_formats)) {
    return ad.ad_formats[0] ?? null
  }
  return ad.ad_formats
}

export function groupAdsByFormat(
  ads: PortalAd[],
  formats: AdFormat[]
): Map<string, { format: AdFormat; ads: PortalAd[] }> {
  const activeFormats = filterActiveFormats(formats)
  const activeAds = filterActiveAds(ads)
  const grouped = new Map<string, { format: AdFormat; ads: PortalAd[] }>()

  for (const format of activeFormats) {
    grouped.set(format.id, { format, ads: [] })
  }

  for (const ad of activeAds) {
    const bucket = grouped.get(ad.format_id)
    if (bucket) {
      bucket.ads.push(ad)
    }
  }

  return grouped
}

export function getNextAdIndex(currentIndex: number, adCount: number): number {
  if (adCount <= 0) return 0
  return (currentIndex + 1) % adCount
}

export function normalizeOptionalDate(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function validateAdSchedule(startsAt: string | null, endsAt: string | null): string | null {
  if (startsAt && endsAt) {
    const start = new Date(startsAt)
    const end = new Date(endsAt)
    if (end < start) {
      return 'Das Enddatum muss nach dem Startdatum liegen.'
    }
  }
  return null
}
