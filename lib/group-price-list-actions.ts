import type { SupabaseClient } from '@supabase/supabase-js'
import {
  loadActivePriceCatalog,
  loadPriceRulesForScope,
  savePriceRulesForScope,
  type CatalogPriceRecord,
} from '@/lib/price-catalog-loader'
import { isOverridableCatalogPrice } from '@/lib/price-catalog-policy'
import { resolveCatalogPrice, type PriceRuleRow } from '@/lib/price-resolver'

export interface CustomerGroupRow {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type PromoteCatalogUpdate =
  | { priceId: string; kind: 'skip' }
  | { priceId: string; kind: 'update'; price: number }
  | { priceId: string; kind: 'archive' }

export function buildDuplicateGroupName(sourceName: string, existingNames: string[]): string {
  const base = `${sourceName} (Kopie)`
  if (!existingNames.includes(base)) return base

  let suffix = 2
  while (existingNames.includes(`${sourceName} (Kopie ${suffix})`)) {
    suffix += 1
  }
  return `${sourceName} (Kopie ${suffix})`
}

export function computePromoteCatalogUpdates(
  catalogPrices: CatalogPriceRecord[],
  groupRules: PriceRuleRow[]
): {
  updates: PromoteCatalogUpdate[]
  updatedCount: number
  archivedCount: number
} {
  const ruleMap = new Map(groupRules.map((rule) => [rule.price_id, rule]))
  const updates: PromoteCatalogUpdate[] = []
  let updatedCount = 0
  let archivedCount = 0

  for (const catalog of catalogPrices) {
    if (!isOverridableCatalogPrice(catalog)) {
      updates.push({ priceId: catalog.id, kind: 'skip' })
      continue
    }

    const groupRule = ruleMap.get(catalog.id)
    if (!groupRule) {
      updates.push({ priceId: catalog.id, kind: 'skip' })
      continue
    }

    const resolved = resolveCatalogPrice(catalog, { groupRule })

    if (groupRule.rule_mode === 'not_applicable') {
      updates.push({ priceId: catalog.id, kind: 'archive' })
      archivedCount += 1
      continue
    }

    if (groupRule.rule_mode === 'custom' && resolved.final_price != null) {
      updates.push({ priceId: catalog.id, kind: 'update', price: resolved.final_price })
      updatedCount += 1
      continue
    }

    updates.push({ priceId: catalog.id, kind: 'skip' })
  }

  return { updates, updatedCount, archivedCount }
}

async function loadCustomerGroup(
  supabase: SupabaseClient,
  groupId: string
): Promise<CustomerGroupRow> {
  const { data, error } = await supabase
    .from('customer_groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (error || !data) {
    throw new Error('Kundengruppe nicht gefunden')
  }

  return data as CustomerGroupRow
}

export async function duplicateCustomerGroup(
  supabase: SupabaseClient,
  groupId: string
): Promise<{ group: CustomerGroupRow; copiedRulesCount: number }> {
  const sourceGroup = await loadCustomerGroup(supabase, groupId)

  const { data: existingGroups, error: groupsError } = await supabase
    .from('customer_groups')
    .select('name')

  if (groupsError) throw groupsError

  const duplicateName = buildDuplicateGroupName(
    sourceGroup.name,
    (existingGroups ?? []).map((group) => group.name)
  )

  const { data: newGroup, error: createError } = await supabase
    .from('customer_groups')
    .insert({
      name: duplicateName,
      description: sourceGroup.description,
    })
    .select()
    .single()

  if (createError || !newGroup) {
    throw createError ?? new Error('Gruppe konnte nicht dupliziert werden')
  }

  const sourceRules = await loadPriceRulesForScope(supabase, 'group', groupId)
  if (sourceRules.length > 0) {
    await savePriceRulesForScope(supabase, 'group', newGroup.id, sourceRules)
  }

  return {
    group: newGroup as CustomerGroupRow,
    copiedRulesCount: sourceRules.length,
  }
}

export async function resetGroupToStandard(
  supabase: SupabaseClient,
  groupId: string
): Promise<void> {
  await loadCustomerGroup(supabase, groupId)
  await savePriceRulesForScope(supabase, 'group', groupId, [])
}

export async function promoteGroupToStandard(
  supabase: SupabaseClient,
  groupId: string
): Promise<{ updatedCount: number; archivedCount: number }> {
  await loadCustomerGroup(supabase, groupId)

  const catalog = await loadActivePriceCatalog(supabase)
  const groupRules = await loadPriceRulesForScope(supabase, 'group', groupId)
  const { updates, updatedCount, archivedCount } = computePromoteCatalogUpdates(
    catalog.prices,
    groupRules
  )

  const now = new Date().toISOString()

  for (const update of updates) {
    if (update.kind === 'update') {
      const { error } = await supabase
        .from('prices')
        .update({ price: update.price, updated_at: now })
        .eq('id', update.priceId)
      if (error) throw error
    } else if (update.kind === 'archive') {
      const { error } = await supabase
        .from('prices')
        .update({ archived_at: now, updated_at: now })
        .eq('id', update.priceId)
      if (error) throw error
    }
  }

  await savePriceRulesForScope(supabase, 'group', groupId, [])

  return { updatedCount, archivedCount }
}
