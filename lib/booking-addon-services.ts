import type { AddonService } from '@/lib/types'
import type { BookingLineItemInsert } from '@/lib/booking-extras'

export interface AddonServiceSelection {
  addon_service_id: string
}

export function filterActiveAddonServices(services: AddonService[]): AddonService[] {
  return services
    .filter((service) => service.is_active)
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
    if (!service.is_active) {
      return { valid: false, error: 'Diese Zusatzleistung ist derzeit nicht buchbar.' }
    }
  }

  return { valid: true, serviceById }
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
