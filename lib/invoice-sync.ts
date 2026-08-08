import type { SupabaseClient } from '@supabase/supabase-js'

import { assessInvoiceEligibility } from '@/lib/invoice-eligibility'
import { createSevdeskInvoiceDraft } from '@/lib/sevdesk'
import type {
  BookingLineItem,
  BookingRequest,
  Contact,
  InvoiceSyncCandidate,
  SevdeskInvoiceSyncStatus,
} from '@/lib/types'

interface RequestGroupContext {
  requestGroupId: string
  bookings: BookingRequest[]
  lineItems: BookingLineItem[]
  customer: Contact | null
  sevdeskInvoiceSyncStatus: SevdeskInvoiceSyncStatus
}

async function loadRequestGroupContext(
  db: SupabaseClient,
  requestGroupId: string
): Promise<RequestGroupContext | null> {
  const { data: bookingsByGroup, error: groupError } = await db
    .from('bookings')
    .select('*')
    .eq('request_group_id', requestGroupId)
    .order('created_at', { ascending: true })

  let bookings = (bookingsByGroup ?? []) as BookingRequest[]

  if (!groupError && bookings.length === 0) {
    const { data: singleBooking } = await db
      .from('bookings')
      .select('*')
      .eq('id', requestGroupId)
      .maybeSingle()
    if (singleBooking) {
      bookings = [singleBooking as BookingRequest]
    }
  }

  if (bookings.length === 0) {
    return null
  }

  let { data: group } = await db
    .from('booking_request_groups')
    .select('*')
    .eq('id', requestGroupId)
    .maybeSingle()

  const customerId = group?.customer_id ?? bookings[0].customer_id

  if (!group) {
    const { data: createdGroup } = await db
      .from('booking_request_groups')
      .insert({
        id: requestGroupId,
        customer_id: customerId,
      })
      .select('*')
      .maybeSingle()
    group = createdGroup
  }

  const [{ data: customer }, { data: lineItems }] = await Promise.all([
    db.from('contacts').select('*').eq('id', customerId).maybeSingle(),
    db
      .from('booking_line_items')
      .select('*')
      .eq('request_group_id', requestGroupId)
      .order('created_at', { ascending: true }),
  ])

  return {
    requestGroupId,
    bookings,
    lineItems: (lineItems ?? []) as BookingLineItem[],
    customer: (customer as Contact | null) ?? null,
    sevdeskInvoiceSyncStatus:
      (group?.sevdesk_invoice_sync_status as SevdeskInvoiceSyncStatus | undefined) ?? 'none',
  }
}

function buildCandidate(context: RequestGroupContext): InvoiceSyncCandidate {
  const starts = context.bookings.map((booking) => booking.start_date).sort()
  const ends = context.bookings
    .map((booking) => booking.end_date)
    .filter((value): value is string => Boolean(value))
    .sort()

  const assessment = assessInvoiceEligibility({
    bookings: context.bookings,
    lineItems: context.lineItems,
    customer: context.customer,
    sevdeskInvoiceSyncStatus: context.sevdeskInvoiceSyncStatus,
  })

  const customerName = context.customer
    ? [context.customer.vorname, context.customer.nachname].filter(Boolean).join(' ')
    : 'Unbekannt'

  return {
    requestGroupId: context.requestGroupId,
    customerId: context.customer?.id ?? context.bookings[0].customer_id,
    customerName,
    kundennummer: context.customer?.kundennummer ?? null,
    startDate: starts[0] ?? '',
    endDate: ends.at(-1) ?? null,
    lineItemCount: context.lineItems.length,
    lineItemTotal: assessment.lineItemTotal,
    sevdeskInvoiceSyncStatus: context.sevdeskInvoiceSyncStatus,
    blockers: assessment.blockers,
  }
}

export async function listInvoiceSyncCandidates(db: SupabaseClient): Promise<InvoiceSyncCandidate[]> {
  const { data: bookings, error } = await db
    .from('bookings')
    .select('id, request_group_id, customer_id, start_date, end_date, status')
    .neq('status', 'cancelled')
    .order('start_date', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const groupIds = new Set<string>()
  for (const booking of bookings ?? []) {
    groupIds.add(booking.request_group_id ?? booking.id)
  }

  const candidates: InvoiceSyncCandidate[] = []

  for (const requestGroupId of groupIds) {
    const context = await loadRequestGroupContext(db, requestGroupId)
    if (!context) continue
    if (context.sevdeskInvoiceSyncStatus === 'synced') continue
    candidates.push(buildCandidate(context))
  }

  return candidates.sort((a, b) => b.startDate.localeCompare(a.startDate))
}

async function loadArticleMappings(
  db: SupabaseClient,
  lineItems: BookingLineItem[]
): Promise<Map<string, string>> {
  const priceIds = lineItems.map((item) => item.price_id).filter(Boolean) as string[]
  const addonIds = lineItems.map((item) => item.addon_service_id).filter(Boolean) as string[]

  const mappings = new Map<string, string>()

  if (priceIds.length > 0) {
    const { data: prices } = await db
      .from('prices')
      .select('id, sevdesk_article_id')
      .in('id', priceIds)

    for (const price of prices ?? []) {
      if (price.sevdesk_article_id) {
        mappings.set(`price:${price.id}`, price.sevdesk_article_id)
      }
    }
  }

  if (addonIds.length > 0) {
    const { data: addons } = await db
      .from('addon_services')
      .select('id, sevdesk_article_id')
      .in('id', addonIds)

    for (const addon of addons ?? []) {
      if (addon.sevdesk_article_id) {
        mappings.set(`addon:${addon.id}`, addon.sevdesk_article_id)
      }
    }
  }

  return mappings
}

export async function syncInvoiceDraftForRequestGroup(
  db: SupabaseClient,
  requestGroupId: string
): Promise<{ invoiceId: string; invoiceNumber: string | null }> {
  const context = await loadRequestGroupContext(db, requestGroupId)
  if (!context) {
    throw new Error('Buchungsanfrage nicht gefunden')
  }

  const assessment = assessInvoiceEligibility({
    bookings: context.bookings,
    lineItems: context.lineItems,
    customer: context.customer,
    sevdeskInvoiceSyncStatus: context.sevdeskInvoiceSyncStatus,
  })

  if (!assessment.eligible) {
    throw new Error(assessment.blockers.join('; '))
  }

  if (!context.customer?.sevdesk_contact_id) {
    throw new Error('Kunde ist nicht mit SevDesk verknüpft')
  }

  await db
    .from('booking_request_groups')
    .update({
      sevdesk_invoice_sync_status: 'pending',
      sevdesk_invoice_sync_error: null,
    })
    .eq('id', requestGroupId)

  try {
    const articleMappings = await loadArticleMappings(db, context.lineItems)
    const positions = context.lineItems
      .filter((item) => item.price_type !== 'text')
      .map((item) => {
        const sevdeskArticleId =
          (item.price_id ? articleMappings.get(`price:${item.price_id}`) : null) ??
          (item.addon_service_id ? articleMappings.get(`addon:${item.addon_service_id}`) : null) ??
          null

        const quantity = Math.max(1, Number(item.quantity) || 1)
        const lineTotal = Number(item.line_total)
        const unitPrice =
          item.unit_price != null
            ? Number(item.unit_price)
            : quantity > 0
              ? lineTotal / quantity
              : lineTotal

        return {
          label: item.label,
          description: item.description,
          quantity,
          unitPrice,
          lineTotal,
          sevdeskArticleId,
        }
      })

    const draft = await createSevdeskInvoiceDraft({
      contactId: context.customer.sevdesk_contact_id,
      positions,
      header: `Betreuung ${context.bookings[0]?.start_date ?? ''}`,
    })

    const { error: updateError } = await db
      .from('booking_request_groups')
      .update({
        sevdesk_invoice_id: draft.invoiceId,
        sevdesk_invoice_number: draft.invoiceNumber,
        sevdesk_invoice_synced_at: new Date().toISOString(),
        sevdesk_invoice_sync_status: 'synced',
        sevdesk_invoice_sync_error: null,
      })
      .eq('id', requestGroupId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return draft
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rechnungs-Sync fehlgeschlagen'
    await db
      .from('booking_request_groups')
      .update({
        sevdesk_invoice_sync_status: 'failed',
        sevdesk_invoice_sync_error: message,
      })
      .eq('id', requestGroupId)
    throw error
  }
}

export async function syncInvoiceDrafts(
  db: SupabaseClient,
  requestGroupIds: string[],
  initiatedBy?: string | null
): Promise<{
  synced: Array<{ requestGroupId: string; invoiceId: string; invoiceNumber: string | null }>
  failed: Array<{ requestGroupId: string; error: string }>
}> {
  const synced: Array<{ requestGroupId: string; invoiceId: string; invoiceNumber: string | null }> =
    []
  const failed: Array<{ requestGroupId: string; error: string }> = []

  const { data: run } = await db
    .from('sevdesk_sync_runs')
    .insert({
      run_type: 'invoice_sync',
      initiated_by: initiatedBy ?? null,
      summary: { synced: 0, failed: 0 },
    })
    .select('id')
    .single()

  for (const requestGroupId of requestGroupIds) {
    try {
      const draft = await syncInvoiceDraftForRequestGroup(db, requestGroupId)
      synced.push({
        requestGroupId,
        invoiceId: draft.invoiceId,
        invoiceNumber: draft.invoiceNumber,
      })
    } catch (error) {
      failed.push({
        requestGroupId,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      })
    }
  }

  if (run?.id) {
    await db
      .from('sevdesk_sync_runs')
      .update({
        finished_at: new Date().toISOString(),
        summary: { synced: synced.length, failed: failed.length, synced, failed },
      })
      .eq('id', run.id)
  }

  return { synced, failed }
}
