import { describe, expect, it } from 'vitest'

import {
  addonSelectionTotal,
  buildAddonLineItemsFromSelections,
  filterActiveAddonServices,
  validateAddonServiceSelections,
} from '@/lib/booking-addon-services'
import type { AddonService } from '@/lib/types'

const baseService = (overrides: Partial<AddonService> = {}): AddonService => ({
  id: 'svc-1',
  title: 'Medikamentengabe',
  description: 'Tägliche Gabe',
  amount: 12.5,
  sort_order: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('booking-addon-services', () => {
  it('filterActiveAddonServices returns only active services sorted', () => {
    const services = filterActiveAddonServices([
      baseService({ id: 'b', title: 'B', sort_order: 2, is_active: false }),
      baseService({ id: 'a', title: 'A', sort_order: 1 }),
      baseService({ id: 'c', title: 'C', sort_order: 3 }),
    ])

    expect(services.map((service) => service.id)).toEqual(['a', 'c'])
  })

  it('validateAddonServiceSelections rejects inactive and duplicate selections', () => {
    const allowed = [
      baseService(),
      baseService({ id: 'svc-2', title: 'Inaktiv', is_active: false }),
    ]

    expect(
      validateAddonServiceSelections(
        [{ addon_service_id: 'svc-1' }, { addon_service_id: 'svc-1' }],
        allowed
      )
    ).toEqual({
      valid: false,
      error: 'Jede Zusatzleistung darf nur einmal gewählt werden.',
    })

    expect(
      validateAddonServiceSelections([{ addon_service_id: 'svc-2' }], allowed)
    ).toEqual({
      valid: false,
      error: 'Diese Zusatzleistung ist derzeit nicht buchbar.',
    })
  })

  it('buildAddonLineItemsFromSelections stores fixed amount snapshots', () => {
    const service = baseService()
    const validation = validateAddonServiceSelections([{ addon_service_id: service.id }], [service])
    expect(validation.valid).toBe(true)
    if (!validation.valid) return

    const items = buildAddonLineItemsFromSelections(
      'group-1',
      [{ addon_service_id: service.id }],
      validation.serviceById,
      'user-1'
    )

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      request_group_id: 'group-1',
      addon_service_id: 'svc-1',
      price_id: null,
      label: 'Medikamentengabe',
      price_type: 'fixed',
      quantity: 1,
      unit_price: 12.5,
      line_total: 12.5,
      source: 'customer',
      created_by: 'user-1',
    })
  })

  it('addonSelectionTotal sums selected services', () => {
    const services = [
      baseService({ id: 'a', amount: 10 }),
      baseService({ id: 'b', amount: 5.5 }),
    ]

    expect(
      addonSelectionTotal([{ addon_service_id: 'a' }, { addon_service_id: 'b' }], services)
    ).toBe(15.5)
  })
})
