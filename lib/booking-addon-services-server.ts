import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildAddonLineItemsFromSelections,
  filterActiveAddonServices,
  filterBillableAddonServices,
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
    is_billable: Boolean(row.is_billable),
    archived_at: row.archived_at != null ? String(row.archived_at) : null,
    sevdesk_article_id: row.sevdesk_article_id != null ? String(row.sevdesk_article_id) : null,
    sevdesk_part_number: row.sevdesk_part_number != null ? String(row.sevdesk_part_number) : null,
    sevdesk_sync_status:
      row.sevdesk_sync_status != null
        ? (String(row.sevdesk_sync_status) as AddonService['sevdesk_sync_status'])
        : undefined,
    sevdesk_synced_at: row.sevdesk_synced_at != null ? String(row.sevdesk_synced_at) : null,
    sevdesk_sync_error: row.sevdesk_sync_error != null ? String(row.sevdesk_sync_error) : null,
    sevdesk_usage_count:
      row.sevdesk_usage_count != null ? Number(row.sevdesk_usage_count) : undefined,
    sevdesk_usage_synced_at:
      row.sevdesk_usage_synced_at != null ? String(row.sevdesk_usage_synced_at) : null,
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
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) {
    throw error
  }

  return filterActiveAddonServices((data || []).map(normalizeAddonService))
}

export async function loadBillableAddonServices(
  supabase: SupabaseClient
): Promise<AddonService[]> {
  const { data, error } = await supabase
    .from('addon_services')
    .select('*')
    .eq('is_billable', true)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) {
    throw error
  }

  return filterBillableAddonServices((data || []).map(normalizeAddonService))
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
