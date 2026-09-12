import { describe, expect, it } from 'vitest'

import { resolvePickupTimesRows } from '@/lib/pickup-times-reference'
import { defaultKundenportalData } from '@/lib/cms/portal-defaults'

describe('resolvePickupTimesRows', () => {
  it('returns CMS rows when provided', () => {
    const rows = [{ days: 'Test', times: '8-9h' }]
    expect(resolvePickupTimesRows(rows)).toEqual(rows)
  })

  it('falls back to default portal pickup times when empty', () => {
    expect(resolvePickupTimesRows([])).toEqual(defaultKundenportalData.pickupTimesList)
    expect(resolvePickupTimesRows(null)).toEqual(defaultKundenportalData.pickupTimesList)
  })
})
