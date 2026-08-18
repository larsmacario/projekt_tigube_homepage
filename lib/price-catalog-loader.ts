import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingDbObject } from '@/lib/price-legacy-compat'
import {
  isPriceArchived,
  resolveCatalogPrice,
  type PriceRuleRow,
  type PriceScopeType,
  type ResolvedPriceItem,
} from '@/lib/price-resolver'

export interface ServiceAreaRow {
  id: string
  slug: string
  name: string
  description: string | null
  sort_order: number
  archived_at: string | null
}

export interface PriceCategoryRow {
  id: string
  name: string
  description: string | null
  service_type: 'hundepension' | 'katzenbetreuung' | 'all'
  service_area_id: string | null
  sort_order: number
  archived_at: string | null
}

export interface CatalogPriceRecord {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number | null
  price_type: 'fixed' | 'percentage' | 'per_unit' | 'text'
  unit: string | null
  note: string | null
  sort_order: number
  usage: 'base' | 'extra' | 'surcharge' | 'info'
  archived_at: string | null
  sevdesk_article_id: string | null
}

export interface ResolvedCatalogPrice extends CatalogPriceRecord, ResolvedPriceItem {}

export interface PriceCatalogContext {
  customerId: string | null
  customerGroupId: string | null
  petId?: string | null
}

function ruleMapByPriceId(rows: PriceRuleRow[]): Map<string, PriceRuleRow> {
  return new Map(rows.map((row) => [row.price_id, row]))
}

interface LegacyOverrideRow {
  price_id: string
  price: number | null
  discount_type: string | null
  discount_value: number | null
}

function legacyOverrideToRule(row: LegacyOverrideRow): PriceRuleRow {
  return {
    price_id: row.price_id,
    rule_mode: 'custom',
    price: row.price,
    discount_type: row.discount_type as PriceRuleRow['discount_type'],
    discount_value: row.discount_value,
  }
}

async function loadLegacyPriceRulesForScope(
  supabase: SupabaseClient,
  scopeType: PriceScopeType,
  scopeId: string
): Promise<PriceRuleRow[]> {
  if (scopeType === 'group') {
    const { data, error } = await supabase
      .from('group_prices')
      .select('price_id, price, discount_type, discount_value')
      .eq('group_id', scopeId)
    if (error) throw error
    return (data ?? []).map((row) => legacyOverrideToRule(row as LegacyOverrideRow))
  }

  if (scopeType === 'customer') {
    const { data, error } = await supabase
      .from('customer_prices')
      .select('price_id, price, discount_type, discount_value')
      .eq('customer_id', scopeId)
    if (error) throw error
    return (data ?? []).map((row) => legacyOverrideToRule(row as LegacyOverrideRow))
  }

  return []
}

async function saveLegacyPriceRulesForScope(
  supabase: SupabaseClient,
  scopeType: 'group' | 'customer',
  scopeId: string,
  rules: PriceRuleRow[]
): Promise<void> {
  const table = scopeType === 'group' ? 'group_prices' : 'customer_prices'
  const scopeColumn = scopeType === 'group' ? 'group_id' : 'customer_id'

  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq(scopeColumn, scopeId)
  if (deleteError) throw deleteError

  const customRules = rules.filter((rule) => rule.rule_mode === 'custom')
  if (customRules.length === 0) return

  const records = customRules.map((rule) => ({
    [scopeColumn]: scopeId,
    price_id: rule.price_id,
    price: rule.price,
    discount_type: rule.discount_type ?? null,
    discount_value: rule.discount_value ?? null,
    updated_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabase.from(table).insert(records)
  if (insertError) throw insertError
}

export async function loadPriceRulesForScope(
  supabase: SupabaseClient,
  scopeType: PriceScopeType,
  scopeId: string
): Promise<PriceRuleRow[]> {
  const { data, error } = await supabase
    .from('price_rules')
    .select('price_id, rule_mode, price, discount_type, discount_value')
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)

  if (!error) return (data ?? []) as PriceRuleRow[]

  if (isMissingDbObject(error)) {
    return loadLegacyPriceRulesForScope(supabase, scopeType, scopeId)
  }

  throw error
}

export async function loadActivePriceCatalog(
  supabase: SupabaseClient,
  options?: { includeArchived?: boolean }
): Promise<{
  serviceAreas: ServiceAreaRow[]
  categories: PriceCategoryRow[]
  prices: CatalogPriceRecord[]
}> {
  const [serviceAreasRes, categoriesRes, pricesRes] = await Promise.all([
    supabase.from('service_areas').select('*').order('sort_order', { ascending: true }),
    supabase.from('price_categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('prices').select('*').order('sort_order', { ascending: true }),
  ])

  if (categoriesRes.error) throw categoriesRes.error
  if (pricesRes.error) throw pricesRes.error

  const includeArchived = options?.includeArchived ?? false

  return {
    serviceAreas: isMissingDbObject(serviceAreasRes.error)
      ? []
      : ((serviceAreasRes.data ?? []) as ServiceAreaRow[]).filter(
          (area) => includeArchived || area.archived_at == null
        ),
    categories: ((categoriesRes.data ?? []) as PriceCategoryRow[]).filter(
      (cat) => includeArchived || cat.archived_at == null
    ),
    prices: ((pricesRes.data ?? []) as CatalogPriceRecord[]).filter(
      (price) => includeArchived || price.archived_at == null
    ),
  }
}

export async function loadResolvedPriceCatalog(
  supabase: SupabaseClient,
  context: PriceCatalogContext
): Promise<{
  serviceAreas: ServiceAreaRow[]
  categories: PriceCategoryRow[]
  prices: ResolvedCatalogPrice[]
}> {
  const catalog = await loadActivePriceCatalog(supabase)

  const [groupRules, customerRules, petRules] = await Promise.all([
    context.customerGroupId
      ? loadPriceRulesForScope(supabase, 'group', context.customerGroupId)
      : Promise.resolve([]),
    context.customerId
      ? loadPriceRulesForScope(supabase, 'customer', context.customerId)
      : Promise.resolve([]),
    context.petId
      ? loadPriceRulesForScope(supabase, 'pet', context.petId)
      : Promise.resolve([]),
  ])

  const groupMap = ruleMapByPriceId(groupRules)
  const customerMap = ruleMapByPriceId(customerRules)
  const petMap = ruleMapByPriceId(petRules)

  const prices = catalog.prices
    .filter((price) => !isPriceArchived(price))
    .map((price) => {
      const resolved = resolveCatalogPrice(price, {
        groupRule: groupMap.get(price.id) ?? null,
        customerRule: customerMap.get(price.id) ?? null,
        petRule: petMap.get(price.id) ?? null,
      })

      return {
        ...price,
        ...resolved,
        catalog_price: price.price,
      }
    })

  return {
    serviceAreas: catalog.serviceAreas,
    categories: catalog.categories,
    prices,
  }
}

export async function savePriceRulesForScope(
  supabase: SupabaseClient,
  scopeType: PriceScopeType,
  scopeId: string,
  rules: PriceRuleRow[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('price_rules')
    .delete()
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)

  if (deleteError) {
    if (
      isMissingDbObject(deleteError) &&
      (scopeType === 'group' || scopeType === 'customer')
    ) {
      await saveLegacyPriceRulesForScope(supabase, scopeType, scopeId, rules)
      return
    }
    throw deleteError
  }

  const savableRules = rules.filter(
    (rule) => rule.rule_mode === 'custom' || rule.rule_mode === 'not_applicable'
  )

  if (savableRules.length === 0) return

  const records = savableRules.map((rule) => ({
    scope_type: scopeType,
    scope_id: scopeId,
    price_id: rule.price_id,
    rule_mode: rule.rule_mode,
    price: rule.price,
    discount_type: rule.discount_type ?? null,
    discount_value: rule.discount_value ?? null,
    updated_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabase.from('price_rules').insert(records)
  if (insertError) {
    if (insertError.message?.includes('price_rules_pet_only_inherit_modes')) {
      throw new Error(
        'SQL-Migration erforderlich: Bitte führe im Supabase SQL-Editor folgenden Befehl aus: ALTER TABLE price_rules DROP CONSTRAINT IF EXISTS price_rules_pet_only_inherit_modes;'
      )
    }
    throw insertError
  }
}
