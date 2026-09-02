import type { SupabaseClient } from '@supabase/supabase-js'

import { getAdminDbClient } from '@/lib/admin-auth'
import {
  createSevdeskPart,
  fetchSevdeskPartUsageCounts,
  findSevdeskPartByName,
  listAllSevdeskParts,
  updateSevdeskArticleImportSummary,
} from '@/lib/sevdesk'
import type { AddonService, SevdeskArticleImportSummary, SevdeskPart, SevdeskSyncStatus } from '@/lib/types'

export type CatalogArticleTable = 'prices' | 'addon_services'

interface PriceCatalogRow {
  id: string
  name: string
  description: string | null
  price: number | null
  price_type: string
  sevdesk_article_id: string | null
  sevdesk_part_number: string | null
  sevdesk_sync_status: SevdeskSyncStatus | null
}

interface AddonCatalogRow {
  id: string
  title: string
  description: string | null
  amount: number
  sevdesk_article_id: string | null
  sevdesk_part_number: string | null
  sevdesk_sync_status: SevdeskSyncStatus | null
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function buildPartNumber(table: CatalogArticleTable, id: string): string {
  const prefix = table === 'prices' ? 'PR' : 'ZL'
  const shortId = id.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `${prefix}-${shortId}`
}

function getCatalogName(table: CatalogArticleTable, row: PriceCatalogRow | AddonCatalogRow): string {
  return table === 'prices' ? (row as PriceCatalogRow).name : (row as AddonCatalogRow).title
}

function getCatalogPrice(table: CatalogArticleTable, row: PriceCatalogRow | AddonCatalogRow): number | null {
  if (table === 'addon_services') {
    const amount = Number((row as AddonCatalogRow).amount)
    return Number.isFinite(amount) ? amount : null
  }

  const priceRow = row as PriceCatalogRow
  if (priceRow.price_type === 'text' || priceRow.price_type === 'percentage') {
    return null
  }

  const price = Number(priceRow.price)
  return Number.isFinite(price) ? price : null
}

function getCatalogDescription(
  table: CatalogArticleTable,
  row: PriceCatalogRow | AddonCatalogRow
): string | null {
  return table === 'prices'
    ? (row as PriceCatalogRow).description
    : (row as AddonCatalogRow).description
}

async function markSyncState(
  db: SupabaseClient,
  table: CatalogArticleTable,
  id: string,
  patch: {
    sevdesk_sync_status: SevdeskSyncStatus
    sevdesk_synced_at?: string | null
    sevdesk_sync_error?: string | null
    sevdesk_article_id?: string | null
    sevdesk_part_number?: string | null
  }
): Promise<void> {
  const { error } = await db.from(table).update(patch).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}

export async function ensureSevdeskArticleLink(
  db: SupabaseClient,
  input: { table: CatalogArticleTable; row: PriceCatalogRow | AddonCatalogRow }
): Promise<{ linked: boolean; skipped?: boolean; reason?: string }> {
  const { table, row } = input

  if (row.sevdesk_article_id && row.sevdesk_sync_status === 'synced') {
    return { linked: true, skipped: true, reason: 'Bereits verknüpft' }
  }

  const name = getCatalogName(table, row).trim()
  if (!name) {
    await markSyncState(db, table, row.id, {
      sevdesk_sync_status: 'failed',
      sevdesk_sync_error: 'Name fehlt',
    })
    return { linked: false, reason: 'Name fehlt' }
  }

  const unitPrice = getCatalogPrice(table, row)
  if (unitPrice == null) {
    await markSyncState(db, table, row.id, {
      sevdesk_sync_status: 'none',
      sevdesk_sync_error: null,
    })
    return {
      linked: false,
      skipped: true,
      reason: 'Kein fester Preis für SevDesk-Artikel',
    }
  }

  await markSyncState(db, table, row.id, {
    sevdesk_sync_status: 'pending',
    sevdesk_sync_error: null,
  })

  try {
    const existingPart = await findSevdeskPartByName(name)
    const partNumber = buildPartNumber(table, row.id)
    const description = getCatalogDescription(table, row)

    let sevdeskArticleId: string
    let sevdeskPartNumber: string

    if (existingPart) {
      sevdeskArticleId = existingPart.id
      sevdeskPartNumber = existingPart.partNumber ?? partNumber
    } else {
      const created = await createSevdeskPart({
        name,
        partNumber,
        price: unitPrice,
        text: description,
      })
      sevdeskArticleId = created.partId
      sevdeskPartNumber = created.partNumber
    }

    await markSyncState(db, table, row.id, {
      sevdesk_article_id: sevdeskArticleId,
      sevdesk_part_number: sevdeskPartNumber,
      sevdesk_sync_status: 'synced',
      sevdesk_synced_at: new Date().toISOString(),
      sevdesk_sync_error: null,
    })

    return { linked: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SevDesk-Verknüpfung fehlgeschlagen'
    await markSyncState(db, table, row.id, {
      sevdesk_sync_status: 'failed',
      sevdesk_sync_error: message,
    })
    return { linked: false, reason: message }
  }
}

function findUnlinkedPriceByPartNumber(
  prices: PriceCatalogRow[],
  partNumber: string | null
): PriceCatalogRow | null {
  if (!partNumber) return null
  const normalized = partNumber.trim().toLowerCase()
  return (
    prices.find(
      (price) =>
        !price.sevdesk_article_id &&
        price.sevdesk_part_number?.trim().toLowerCase() === normalized
    ) ?? null
  )
}

function findUnlinkedPriceByName(prices: PriceCatalogRow[], name: string | null): PriceCatalogRow | null {
  if (!name) return null
  const normalized = normalizeName(name)
  return (
    prices.find(
      (price) => !price.sevdesk_article_id && normalizeName(price.name) === normalized
    ) ?? null
  )
}

function findUnlinkedAddonByPartNumber(
  addons: AddonCatalogRow[],
  partNumber: string | null
): AddonCatalogRow | null {
  if (!partNumber) return null
  const normalized = partNumber.trim().toLowerCase()
  return (
    addons.find(
      (addon) =>
        !addon.sevdesk_article_id &&
        addon.sevdesk_part_number?.trim().toLowerCase() === normalized
    ) ?? null
  )
}

function findUnlinkedAddonByName(addons: AddonCatalogRow[], name: string | null): AddonCatalogRow | null {
  if (!name) return null
  const normalized = normalizeName(name)
  return (
    addons.find(
      (addon) => !addon.sevdesk_article_id && normalizeName(addon.title) === normalized
    ) ?? null
  )
}

async function linkImportedPart(
  db: SupabaseClient,
  table: CatalogArticleTable,
  localId: string,
  part: SevdeskPart
): Promise<void> {
  await markSyncState(db, table, localId, {
    sevdesk_article_id: part.id,
    sevdesk_part_number: part.partNumber,
    sevdesk_sync_status: 'synced',
    sevdesk_synced_at: new Date().toISOString(),
    sevdesk_sync_error: null,
  })
}

async function refreshCachedSevdeskUsageCounts(
  db: SupabaseClient,
  usageCounts: Map<string, number>
): Promise<number> {
  const syncedAt = new Date().toISOString()
  let updated = 0

  const [{ data: addons, error: addonsError }, { data: prices, error: pricesError }] =
    await Promise.all([
      db.from('addon_services').select('id, sevdesk_article_id').not('sevdesk_article_id', 'is', null),
      db.from('prices').select('id, sevdesk_article_id').not('sevdesk_article_id', 'is', null),
    ])

  if (addonsError) throw new Error(addonsError.message)
  if (pricesError) throw new Error(pricesError.message)

  for (const row of addons ?? []) {
    if (!row.sevdesk_article_id) continue
    const { error } = await db
      .from('addon_services')
      .update({
        sevdesk_usage_count: usageCounts.get(row.sevdesk_article_id) ?? 0,
        sevdesk_usage_synced_at: syncedAt,
      })
      .eq('id', row.id)

    if (error) throw new Error(error.message)
    updated += 1
  }

  for (const row of prices ?? []) {
    if (!row.sevdesk_article_id) continue
    const { error } = await db
      .from('prices')
      .update({
        sevdesk_usage_count: usageCounts.get(row.sevdesk_article_id) ?? 0,
        sevdesk_usage_synced_at: syncedAt,
      })
      .eq('id', row.id)

    if (error) throw new Error(error.message)
    updated += 1
  }

  return updated
}

export async function importSevdeskArticles(
  db: SupabaseClient,
  initiatedBy?: string | null
): Promise<SevdeskArticleImportSummary> {
  const summary: SevdeskArticleImportSummary = {
    linked: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    usageUpdated: 0,
    failures: [],
  }

  const { data: run } = await db
    .from('sevdesk_sync_runs')
    .insert({
      run_type: 'article_import',
      initiated_by: initiatedBy ?? null,
      summary: { linked: 0, created: 0, skipped: 0, failed: 0, usageUpdated: 0 },
    })
    .select('id')
    .single()

  try {
    let usageCounts = new Map<string, number>()
    try {
      usageCounts = await fetchSevdeskPartUsageCounts()
    } catch (usageError) {
      console.error('SevDesk usage fetch failed:', usageError)
      summary.usageFetchFailed = true
    }

    const [parts, pricesRes, addonsRes] = await Promise.all([
      listAllSevdeskParts(),
      db.from('prices').select(
        'id, name, description, price, price_type, sevdesk_article_id, sevdesk_part_number, sevdesk_sync_status'
      ),
      db.from('addon_services').select(
        'id, title, description, amount, sevdesk_article_id, sevdesk_part_number, sevdesk_sync_status'
      ),
    ])

    if (pricesRes.error) throw new Error(pricesRes.error.message)
    if (addonsRes.error) throw new Error(addonsRes.error.message)

    const prices = (pricesRes.data ?? []) as PriceCatalogRow[]
    const addons = (addonsRes.data ?? []) as AddonCatalogRow[]

    const usedSevdeskIds = new Set<string>()
    for (const price of prices) {
      if (price.sevdesk_article_id) usedSevdeskIds.add(price.sevdesk_article_id)
    }
    for (const addon of addons) {
      if (addon.sevdesk_article_id) usedSevdeskIds.add(addon.sevdesk_article_id)
    }

    for (const part of parts) {
      if (usedSevdeskIds.has(part.id)) {
        summary.skipped += 1
        continue
      }

      try {
        const priceMatch =
          findUnlinkedPriceByPartNumber(prices, part.partNumber) ??
          findUnlinkedPriceByName(prices, part.name)

        if (priceMatch) {
          await linkImportedPart(db, 'prices', priceMatch.id, part)
          priceMatch.sevdesk_article_id = part.id
          usedSevdeskIds.add(part.id)
          summary.linked += 1
          continue
        }

        const addonMatch =
          findUnlinkedAddonByPartNumber(addons, part.partNumber) ??
          findUnlinkedAddonByName(addons, part.name)

        if (addonMatch) {
          await linkImportedPart(db, 'addon_services', addonMatch.id, part)
          addonMatch.sevdesk_article_id = part.id
          usedSevdeskIds.add(part.id)
          summary.linked += 1
          continue
        }

        const amount = part.price != null && Number.isFinite(Number(part.price)) ? Number(part.price) : 0
        const { data: createdAddon, error: createError } = await db
          .from('addon_services')
          .insert({
            title: part.name?.trim() || `SevDesk ${part.id}`,
            description: null,
            amount,
            sort_order: 0,
            is_active: false,
            is_billable: true,
            sevdesk_article_id: part.id,
            sevdesk_part_number: part.partNumber,
            sevdesk_sync_status: 'synced',
            sevdesk_synced_at: new Date().toISOString(),
          })
          .select('*')
          .single()

        if (createError || !createdAddon) {
          throw new Error(createError?.message || 'Zusatzleistung konnte nicht angelegt werden')
        }

        addons.push(createdAddon as AddonCatalogRow)
        usedSevdeskIds.add(part.id)
        summary.created += 1
      } catch (error) {
        summary.failed += 1
        summary.failures?.push({
          partId: part.id,
          partName: part.name,
          reason: error instanceof Error ? error.message : 'Unbekannter Fehler',
        })
      }
    }

    if (usageCounts.size > 0 || summary.usageFetchFailed !== true) {
      try {
        summary.usageUpdated = await refreshCachedSevdeskUsageCounts(db, usageCounts)
      } catch (usageCacheError) {
        console.error('SevDesk usage cache update failed:', usageCacheError)
        summary.usageFetchFailed = true
      }
    }

    await updateSevdeskArticleImportSummary(summary)

    if (run?.id) {
      await db
        .from('sevdesk_sync_runs')
        .update({
          finished_at: new Date().toISOString(),
          summary,
        })
        .eq('id', run.id)
    }

    return summary
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Artikel-Import fehlgeschlagen'
    if (run?.id) {
      await db
        .from('sevdesk_sync_runs')
        .update({
          finished_at: new Date().toISOString(),
          error_message: message,
        })
        .eq('id', run.id)
    }
    throw error
  }
}

export async function retrySevdeskArticleLink(input: {
  table: CatalogArticleTable
  id: string
}): Promise<{ linked: boolean; reason?: string; row?: PriceCatalogRow | AddonCatalogRow | AddonService }> {
  const db = getAdminDbClient()
  const select =
    input.table === 'prices'
      ? 'id, name, description, price, price_type, sevdesk_article_id, sevdesk_part_number, sevdesk_sync_status'
      : 'id, title, description, amount, sevdesk_article_id, sevdesk_part_number, sevdesk_sync_status'

  const { data, error } = await db.from(input.table).select(select).eq('id', input.id).maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Artikel nicht gefunden')

  const row = data as PriceCatalogRow | AddonCatalogRow
  if (row.sevdesk_article_id && row.sevdesk_sync_status === 'synced') {
    return { linked: true, reason: 'Bereits verknüpft', row }
  }

  const result = await ensureSevdeskArticleLink(db, { table: input.table, row })

  const { data: refreshed } = await db.from(input.table).select('*').eq('id', input.id).maybeSingle()

  return {
    ...result,
    row: refreshed as PriceCatalogRow | AddonCatalogRow | AddonService | undefined,
  }
}
