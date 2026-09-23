import { describe, expect, it } from 'vitest'
import {
  clampIntervalSeconds,
  filterActiveAds,
  filterAdsForCustomerAudience,
  getCustomerPetAudienceFlags,
  getNextAdIndex,
  isAdWithinSchedule,
  SIDEBAR_AD_FORMAT_RECOMMENDATIONS,
  validateAdSchedule,
  type PortalAd,
} from '@/lib/portal-ads'

const baseAd = (overrides: Partial<PortalAd> = {}): PortalAd => ({
  id: 'ad-1',
  format_id: 'format-1',
  title: 'Test Ad',
  image_url: 'https://example.com/ad.jpg',
  link_url: null,
  link_target: '_blank',
  audience: 'all',
  sort_order: 0,
  is_active: true,
  starts_at: null,
  ends_at: null,
  ...overrides,
})

describe('portal-ads helpers', () => {
  it('clamps rotation interval', () => {
    expect(clampIntervalSeconds(2)).toBe(3)
    expect(clampIntervalSeconds(8)).toBe(8)
    expect(clampIntervalSeconds(120)).toBe(60)
  })

  it('filters ads by schedule', () => {
    const now = new Date('2026-08-26T12:00:00.000Z')
    const ads = [
      baseAd({ id: 'future', starts_at: '2026-08-27T00:00:00.000Z' }),
      baseAd({ id: 'expired', ends_at: '2026-08-25T23:59:59.000Z' }),
      baseAd({ id: 'active', sort_order: 1 }),
      baseAd({ id: 'inactive', is_active: false, sort_order: 0 }),
    ]

    expect(filterActiveAds(ads, now).map((ad) => ad.id)).toEqual(['active'])
  })

  it('validates schedule order', () => {
    expect(
      validateAdSchedule('2026-08-26T10:00:00.000Z', '2026-08-26T09:00:00.000Z')
    ).toBeTruthy()
    expect(
      validateAdSchedule('2026-08-26T09:00:00.000Z', '2026-08-26T10:00:00.000Z')
    ).toBeNull()
  })

  it('checks individual ad schedule windows', () => {
    const now = new Date('2026-08-26T12:00:00.000Z')
    expect(isAdWithinSchedule(baseAd(), now)).toBe(true)
    expect(
      isAdWithinSchedule(baseAd({ starts_at: '2026-08-27T00:00:00.000Z' }), now)
    ).toBe(false)
  })

  it('lists sidebar format recommendations', () => {
    expect(SIDEBAR_AD_FORMAT_RECOMMENDATIONS.length).toBeGreaterThanOrEqual(3)
    expect(SIDEBAR_AD_FORMAT_RECOMMENDATIONS.some((format) => format.recommended)).toBe(true)
  })

  it('rotates ad index circularly', () => {
    expect(getNextAdIndex(0, 3)).toBe(1)
    expect(getNextAdIndex(2, 3)).toBe(0)
    expect(getNextAdIndex(0, 0)).toBe(0)
  })

  it('derives customer pet audience flags from living pets only', () => {
    expect(
      getCustomerPetAudienceFlags([
        { tierart: 'Hund', deceased_at: null },
        { tierart: 'Katze', deceased_at: '2024-01-01' },
      ])
    ).toEqual({ hasDog: true, hasCat: false })

    expect(
      getCustomerPetAudienceFlags([
        { tierart: 'Katze', deceased_at: null },
        { tierart: 'Andere', deceased_at: null },
      ])
    ).toEqual({ hasDog: false, hasCat: true })
  })

  it('filters ads by customer audience', () => {
    const ads = [
      baseAd({ id: 'all', audience: 'all' }),
      baseAd({ id: 'dog', audience: 'dog' }),
      baseAd({ id: 'cat', audience: 'cat' }),
    ]

    expect(filterAdsForCustomerAudience(ads, { hasDog: true, hasCat: false }).map((ad) => ad.id)).toEqual([
      'all',
      'dog',
    ])
    expect(filterAdsForCustomerAudience(ads, { hasDog: false, hasCat: true }).map((ad) => ad.id)).toEqual([
      'all',
      'cat',
    ])
    expect(filterAdsForCustomerAudience(ads, { hasDog: true, hasCat: true }).map((ad) => ad.id)).toEqual([
      'all',
      'dog',
      'cat',
    ])
    expect(filterAdsForCustomerAudience(ads, { hasDog: false, hasCat: false }).map((ad) => ad.id)).toEqual(['all'])
  })
})
