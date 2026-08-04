import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildAddonLineItemsFromSelections,
  filterActiveAddonServices,
  validateAddonServiceSelections,
  type AddonServiceSelection,
} from '@/lib/booking-addon-services'
import type { AddonService } from '@/lib/types'

function normalizeAddonService(row: Record<string, unknown>): AddonService {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    amount: Number(row.amount),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function loadActiveAddonServices(
  supabase: SupabaseClient
): Promise<AddonService[]> {
  const { data, error } = await supabase
    .from('addon_services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) {
    throw error
  }

  return filterActiveAddonServices((data || []).map(normalizeAddonService))
}

export async function loadAllAddonServices(
  supabase: SupabaseClient
): Promise<AddonService[]> {
  const { data, error } = await supabase
    .from('addon_services')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []).map(normalizeAddonService)
}

export function validateAndBuildAddonLineItems(
  requestGroupId: string,
  selections: AddonServiceSelection[],
  allowedServices: AddonService[],
  createdBy: string | null
) {
  const validation = validateAddonServiceSelections(selections, allowedServices)
  if (!validation.valid) {
    return validation
  }

  return {
    valid: true as const,
    lineItems: buildAddonLineItemsFromSelections(
      requestGroupId,
      selections,
      validation.serviceById,
      createdBy
    ),
  }
}
