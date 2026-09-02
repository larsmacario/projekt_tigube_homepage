import { describe, expect, it } from 'vitest'

import {
  addonSelectionTotal,
  buildAddonLineItemsFromSelections,
  coerceAddonServiceFlags,
  filterActiveAddonServices,
  filterBillableAddonServices,
  isAddonServiceBillable,
  isAddonServiceWizardVisible,
  validateAddonServiceSelections,
  validateAdminAddonServiceSelection,
} from '@/lib/booking-addon-services'
import type { AddonService } from '@/lib/types'

const baseService = (overrides: Partial<AddonService> = {}): AddonService => ({
  id: 'svc-1',
  title: 'Medikamentengabe',
  description: 'Tägliche Gabe',
  amount: 12.5,
  sort_order: 1,
  is_active: true,
  is_billable: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('booking-addon-services', () => {
  it('filterActiveAddonServices returns only wizard-visible non-archived services sorted', () => {
    const services = filterActiveAddonServices([
      baseService({ id: 'b', title: 'B', sort_order: 2, is_active: false }),
      baseService({ id: 'a', title: 'A', sort_order: 1 }),
      baseService({ id: 'c', title: 'C', sort_order: 3 }),
      baseService({
        id: 'd',
        title: 'Archiviert aktiv',
        sort_order: 0,
        is_active: true,
        archived_at: '2026-01-02T00:00:00.000Z',
      }),
      baseService({
        id: 'e',
        title: 'Nur abrechenbar',
        is_active: false,
        is_billable: true,
      }),
    ])

    expect(services.map((service) => service.id)).toEqual(['a', 'c'])
  })

  it('filterBillableAddonServices includes billable-only services', () => {
    const services = filterBillableAddonServices([
      baseService({ id: 'wizard', is_active: true, is_billable: true }),
      baseService({ id: 'admin-only', is_active: false, is_billable: true }),
      baseService({ id: 'inactive', is_active: false, is_billable: false }),
      baseService({
        id: 'archived',
        is_billable: true,
        archived_at: '2026-01-02T00:00:00.000Z',
      }),
    ])

    expect(services.map((service) => service.id)).toEqual(['wizard', 'admin-only'])
  })

  it('coerceAddonServiceFlags rejects wizard without billable', () => {
    expect(coerceAddonServiceFlags({ is_active: true, is_billable: false })).toEqual({
      is_active: true,
      is_billable: false,
      error: 'In Buchungen sichtbare Leistungen müssen abrechenbar sein.',
    })
    expect(coerceAddonServiceFlags({ is_active: true, is_billable: true })).toEqual({
      is_active: true,
      is_billable: true,
    })
  })

  it('isAddonServiceWizardVisible and isAddonServiceBillable respect archive state', () => {
    const service = baseService({ is_active: true, is_billable: true })
    expect(isAddonServiceWizardVisible(service)).toBe(true)
    expect(isAddonServiceBillable(service)).toBe(true)

    const archived = baseService({
      archived_at: '2026-01-02T00:00:00.000Z',
      is_active: true,
      is_billable: true,
    })
    expect(isAddonServiceWizardVisible(archived)).toBe(false)
    expect(isAddonServiceBillable(archived)).toBe(false)
  })

  it('validateAdminAddonServiceSelection accepts billable-only services', () => {
    const allowed = [
      baseService({ id: 'admin-only', is_active: false, is_billable: true }),
    ]

    expect(validateAdminAddonServiceSelection('admin-only', allowed)).toEqual({
      valid: true,
      service: allowed[0],
    })
    expect(validateAdminAddonServiceSelection('missing', allowed)).toEqual({
      valid: false,
      error: 'Zusatzleistung nicht gefunden oder nicht abrechenbar.',
    })
  })

  it('validateAddonServiceSelections rejects archived services', () => {
    const allowed = [
      baseService(),
      baseService({
        id: 'svc-archived',
        title: 'Archiviert',
        is_active: true,
        archived_at: '2026-01-02T00:00:00.000Z',
      }),
    ]

    expect(
      validateAddonServiceSelections([{ addon_service_id: 'svc-archived' }], allowed)
    ).toEqual({
      valid: false,
      error: 'Diese Zusatzleistung ist derzeit nicht buchbar.',
    })
  })

  it('validateAddonServiceSelections rejects inactive and duplicate selections', () => {
    const allowed = [
      baseService(),
      baseService({ id: 'svc-2', title: 'Inaktiv', is_active: false, is_billable: false }),
      baseService({ id: 'svc-3', title: 'Nur Admin', is_active: false, is_billable: true }),
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

    expect(
      validateAddonServiceSelections([{ addon_service_id: 'svc-3' }], allowed)
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
