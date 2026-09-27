import { describe, expect, it } from 'vitest'
import { DEFAULT_PUBLIC_SITE_URL, getPublicSiteUrl, normalizePublicSiteUrl } from '@/lib/site-url'

describe('site-url', () => {
  it('ergänzt https:// wenn nur Hostname gesetzt ist', () => {
    expect(normalizePublicSiteUrl('www.tierischgutbetreut.de')).toBe(
      'https://www.tierischgutbetreut.de'
    )
  })

  it('lässt vollständige URLs unverändert (ohne trailing slash)', () => {
    expect(normalizePublicSiteUrl('https://www.tierischgutbetreut.de/')).toBe(
      'https://www.tierischgutbetreut.de'
    )
  })

  it('nutzt Default ohne Env', () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(getPublicSiteUrl()).toBe(DEFAULT_PUBLIC_SITE_URL)
    process.env.NEXT_PUBLIC_SITE_URL = prev
  })

  it('normalisiert NEXT_PUBLIC_SITE_URL aus der Umgebung', () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL
    process.env.NEXT_PUBLIC_SITE_URL = 'www.tierischgutbetreut.de'
    expect(getPublicSiteUrl()).toBe('https://www.tierischgutbetreut.de')
    process.env.NEXT_PUBLIC_SITE_URL = prev
  })
})
