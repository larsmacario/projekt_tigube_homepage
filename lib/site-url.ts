/** Kanonische öffentliche Domain (OAuth, E-Mails, Sitemap). */
export const DEFAULT_PUBLIC_SITE_URL = 'https://www.tierischgutbetreut.de'

/**
 * Normalisiert NEXT_PUBLIC_SITE_URL (häufig nur Hostname ohne Schema in Vercel).
 */
export function normalizePublicSiteUrl(raw: string): string {
  let value = raw.trim().replace(/\/$/, '')
  if (!value) {
    return DEFAULT_PUBLIC_SITE_URL
  }

  value = value.replace(/^https:\/t/i, 'https://t')

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`
  }

  return value
}

export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) {
    return DEFAULT_PUBLIC_SITE_URL
  }
  return normalizePublicSiteUrl(raw)
}
