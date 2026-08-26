import { describe, expect, it } from 'vitest'
import {
  buildSpringerOfferUrl,
  isOfferAcceptable,
  matchRegistrationsForDate,
  normalizeSpringerWeekdays,
} from '@/lib/springer'

describe('springer helpers', () => {
  it('matchRegistrationsForDate filters by weekday and active flag', () => {
    const registrations = [
      { id: 'a', weekdays: [1, 3, 5], is_active: true },
      { id: 'b', weekdays: [1], is_active: false },
      { id: 'c', weekdays: [2, 4], is_active: true },
    ]

    // 2026-08-26 is Wednesday = ISO 3
    const matched = matchRegistrationsForDate(registrations, '2026-08-26')
    expect(matched.map((r) => r.id)).toEqual(['a'])
  })

  it('isOfferAcceptable allows sent and draft only', () => {
    expect(isOfferAcceptable({ status: 'sent' })).toBe(true)
    expect(isOfferAcceptable({ status: 'draft' })).toBe(true)
    expect(isOfferAcceptable({ status: 'closed' })).toBe(false)
    expect(isOfferAcceptable({ status: 'responded' })).toBe(false)
    expect(isOfferAcceptable({ status: 'send_failed' })).toBe(false)
  })

  it('buildSpringerOfferUrl normalizes trailing slash', () => {
    expect(buildSpringerOfferUrl('https://example.com/', 'tok-1')).toBe(
      'https://example.com/portal/springer/offers/tok-1'
    )
  })

  it('normalizeSpringerWeekdays validates 1-7', () => {
    expect(normalizeSpringerWeekdays([1, 8, 3, 3, '5'])).toEqual([1, 3, 5])
    expect(normalizeSpringerWeekdays([])).toBeNull()
    expect(normalizeSpringerWeekdays('nope')).toBeNull()
  })
})
