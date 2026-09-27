/** Kanonische öffentliche Domain (OAuth, E-Mails, Sitemap). */
export const DEFAULT_PUBLIC_SITE_URL = 'https://www.tierischgutbetreut.de'

export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (raw) {
    return raw.replace(/\/$/, '')
  }
  return DEFAULT_PUBLIC_SITE_URL
}
