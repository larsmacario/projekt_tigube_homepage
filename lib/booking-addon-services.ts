import type { AddonService } from '@/lib/types'
import type { BookingLineItemInsert } from '@/lib/booking-extras'

export interface AddonServiceSelection {
  addon_service_id: string
}

export function isAddonServiceArchived(service: Pick<AddonService, 'archived_at'>): boolean {
  return service.archived_at != null
}

export function isAddonServiceWizardVisible(
  service: Pick<AddonService, 'is_active' | 'archived_at'>
): boolean {
  return Boolean(service.is_active) && !isAddonServiceArchived(service)
}

export function isAddonServiceBillable(
  service: Pick<AddonService, 'is_billable' | 'archived_at'>
): boolean {
  return Boolean(service.is_billable) && !isAddonServiceArchived(service)
}

/** Portal/Wizard: Kunde darf selbst buchen. */
export function isAddonServiceBookable(
  service: Pick<AddonService, 'is_active' | 'archived_at'>
): boolean {
  return isAddonServiceWizardVisible(service)
}

export function coerceAddonServiceFlags(flags: {
  is_active?: boolean
  is_billable?: boolean
}): { is_active: boolean; is_billable: boolean; error?: string } {
  const is_active = Boolean(flags.is_active)
  let is_billable = Boolean(flags.is_billable)

  if (is_active && !is_billable) {
    return {
      is_active,
      is_billable: false,
      error: 'In Buchungen sichtbare Leistungen müssen abrechenbar sein.',
    }
  }

  if (is_active) {
    is_billable = true
  }

  return { is_active, is_billable }
}

export function filterActiveAddonServices(services: AddonService[]): AddonService[] {
  return services
    .filter((service) => isAddonServiceWizardVisible(service))
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'de'))
}

export function filterBillableAddonServices(services: AddonService[]): AddonService[] {
  return services
    .filter((service) => isAddonServiceBillable(service))
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'de'))
}

export function validateAddonServiceSelections(
  selections: AddonServiceSelection[],
  allowedServices: AddonService[]
): { valid: true; serviceById: Map<string, AddonService> } | { valid: false; error: string } {
  const serviceById = new Map(allowedServices.map((service) => [service.id, service]))
  const seen = new Set<string>()

  for (const selection of selections) {
    if (!selection.addon_service_id?.trim()) {
      return { valid: false, error: 'Ungültige Zusatzleistung ausgewählt.' }
    }
    if (seen.has(selection.addon_service_id)) {
      return { valid: false, error: 'Jede Zusatzleistung darf nur einmal gewählt werden.' }
    }
    seen.add(selection.addon_service_id)

    const service = serviceById.get(selection.addon_service_id)
    if (!service) {
      return { valid: false, error: 'Ungültige Zusatzleistung ausgewählt.' }
    }
    if (!isAddonServiceBookable(service)) {
      return { valid: false, error: 'Diese Zusatzleistung ist derzeit nicht buchbar.' }
    }
  }

  return { valid: true, serviceById }
}

export function validateAdminAddonServiceSelection(
  addonServiceId: string,
  allowedServices: AddonService[]
): { valid: true; service: AddonService } | { valid: false; error: string } {
  const service = allowedServices.find((entry) => entry.id === addonServiceId)
  if (!service) {
    return { valid: false, error: 'Zusatzleistung nicht gefunden oder nicht abrechenbar.' }
  }
  if (!isAddonServiceBillable(service)) {
    return { valid: false, error: 'Diese Zusatzleistung ist nicht abrechenbar.' }
  }
  return { valid: true, service }
}

export function buildAddonLineItemsFromSelections(
  requestGroupId: string,
  selections: AddonServiceSelection[],
  serviceById: Map<string, AddonService>,
  createdBy: string | null
): BookingLineItemInsert[] {
  const items: BookingLineItemInsert[] = []

  for (const selection of selections) {
    const service = serviceById.get(selection.addon_service_id)
    if (!service) continue

    const amount = Number(service.amount)
    items.push({
      request_group_id: requestGroupId,
      booking_id: null,
      price_id: null,
      addon_service_id: service.id,
      label: service.title,
      description: service.description,
      price_type: 'fixed',
      unit: null,
      quantity: 1,
      unit_price: amount,
      line_total: amount,
      source: 'customer',
      created_by: createdBy,
    })
  }

  return items
}

export function addonSelectionTotal(
  selections: AddonServiceSelection[],
  services: AddonService[]
): number {
  const byId = new Map(services.map((service) => [service.id, service]))
  return selections.reduce((sum, selection) => {
    const service = byId.get(selection.addon_service_id)
    if (!service) return sum
    return sum + Number(service.amount)
  }, 0)
}
