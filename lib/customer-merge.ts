import type { SupabaseClient } from '@supabase/supabase-js'

import { normalizeCustomerEmail } from '@/lib/customer-email'

export class CustomerMergeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CustomerMergeError'
  }
}

export type CustomerMergeSummary = {
  id: string
  vorname: string | null
  nachname: string | null
  email: string
  kundennummer: string | null
  sevdesk_contact_id: string | null
  user_id: string | null
  status: string | null
  onboarding_completed: boolean | null
  created_at: string
  petCount: number
  documentCount: number
  bookingCount: number
}

export type CustomerDuplicateGroup = {
  kind: 'email_duplicate' | 'key_conflict'
  email: string
  customers: CustomerMergeSummary[]
  suggestedTargetId: string | null
  suggestedSourceId: string | null
  mergeable: boolean
  reason: string | null
}

const CUSTOMER_MERGE_FIELDS = [
  'vorname',
  'nachname',
  'telefonnummer',
  'telefon_2',
  'strasse',
  'hausnummer',
  'plz',
  'ort',
  'notfall_kontakt_name',
  'notfallnummer',
  'kundennummer',
  'sevdesk_contact_id',
  'sevdesk_synced_at',
  'sevdesk_sync_error',
  'customer_group_id',
  'user_id',
] as const

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

export function computeMergedCustomerFields(
  targetCustomer: Record<string, unknown>,
  sourceCustomer: Record<string, unknown>
): Record<string, unknown> {
  const updates: Record<string, unknown> = {}

  for (const field of CUSTOMER_MERGE_FIELDS) {
    const targetValue = targetCustomer[field]
    const sourceValue = sourceCustomer[field]

    if (isEmptyValue(targetValue) && !isEmptyValue(sourceValue)) {
      updates[field] = sourceValue
    }
  }

  if (isEmptyValue(targetCustomer.sevdesk_synced_at) && sourceCustomer.sevdesk_synced_at) {
    updates.sevdesk_synced_at = sourceCustomer.sevdesk_synced_at
  }

  if (targetCustomer.sevdesk_sync_error && !sourceCustomer.sevdesk_sync_error) {
    updates.sevdesk_sync_error = null
  }

  if (
    targetCustomer.onboarding_completed !== true &&
    sourceCustomer.onboarding_completed === true
  ) {
    updates.onboarding_completed = true
  }

  if (targetCustomer.contract_signed !== true && sourceCustomer.contract_signed === true) {
    updates.contract_signed = true
  }

  if (targetCustomer.datenschutz !== true && sourceCustomer.datenschutz === true) {
    updates.datenschutz = true
  }

  if (
    targetCustomer.status !== 'active' &&
    sourceCustomer.status === 'active'
  ) {
    updates.status = 'active'
  }

  return updates
}

export function scoreCustomerMergePriority(customer: CustomerMergeSummary): number {
  let score = 0
  if (customer.user_id) score += 1000
  score += customer.petCount * 10
  score += customer.documentCount * 5
  score += customer.bookingCount * 5
  if (customer.sevdesk_contact_id) score += 2
  if (customer.kundennummer) score += 2
  if (customer.onboarding_completed) score += 1
  return score
}

export function suggestCustomerMergePair(customers: CustomerMergeSummary[]): {
  targetId: string | null
  sourceId: string | null
} {
  if (customers.length < 2) {
    return { targetId: null, sourceId: null }
  }

  const sorted = [...customers].sort((left, right) => {
    const scoreDiff = scoreCustomerMergePriority(right) - scoreCustomerMergePriority(left)
    if (scoreDiff !== 0) return scoreDiff
    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  })

  return {
    targetId: sorted[0]?.id ?? null,
    sourceId: sorted[1]?.id ?? null,
  }
}

export function assertCustomerMergeAllowed(
  targetCustomer: Record<string, unknown>,
  sourceCustomer: Record<string, unknown>
): void {
  if (targetCustomer.id === sourceCustomer.id) {
    throw new CustomerMergeError('Ein Kunde kann nicht mit sich selbst zusammengeführt werden.')
  }

  if (targetCustomer.contact_type !== 'customer' || sourceCustomer.contact_type !== 'customer') {
    throw new CustomerMergeError('Nur Kunden können zusammengeführt werden.')
  }

  const targetUserId = targetCustomer.user_id as string | null | undefined
  const sourceUserId = sourceCustomer.user_id as string | null | undefined
  if (targetUserId && sourceUserId && targetUserId !== sourceUserId) {
    throw new CustomerMergeError(
      'Zwei unterschiedliche Portal-Konten können nicht zusammengeführt werden.'
    )
  }

  const targetEmail = normalizeCustomerEmail(targetCustomer.email)
  const sourceEmail = normalizeCustomerEmail(sourceCustomer.email)
  if (targetEmail !== sourceEmail) {
    throw new CustomerMergeError('Zusammenführen ist nur bei gleicher E-Mail-Adresse möglich.')
  }
}

export function buildCustomerMergeSystemNote(
  sourceCustomer: Record<string, unknown>,
  adminEmail: string
): string {
  const sourceName =
    [sourceCustomer.vorname, sourceCustomer.nachname].filter(Boolean).join(' ') || 'Unbekannt'
  const sourceEmail = (sourceCustomer.email as string | undefined) || 'Keine E-Mail'
  const createdDateStr = sourceCustomer.created_at
    ? new Date(String(sourceCustomer.created_at)).toLocaleString('de-DE')
    : 'Unbekannt'

  return `System-Notiz: Kunde "${sourceName}" (${sourceEmail}) wurde in diesen Datensatz zusammengeführt.
Original-Erstellungsdatum: ${createdDateStr}
Ausgeführt von: ${adminEmail}`
}

async function countByCustomerId(
  db: SupabaseClient,
  table: string,
  customerId: string,
  column = 'customer_id'
): Promise<number> {
  const { count, error } = await db
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, customerId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function loadCustomerMergeSummary(
  db: SupabaseClient,
  customerId: string
): Promise<CustomerMergeSummary | null> {
  const { data, error } = await db
    .from('contacts')
    .select(
      'id, vorname, nachname, email, kundennummer, sevdesk_contact_id, user_id, status, onboarding_completed, created_at'
    )
    .eq('id', customerId)
    .eq('contact_type', 'customer')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const [petCount, documentCount, bookingCount] = await Promise.all([
    countByCustomerId(db, 'pets', customerId),
    countByCustomerId(db, 'documents', customerId),
    countByCustomerId(db, 'bookings', customerId),
  ])

  return {
    ...data,
    petCount,
    documentCount,
    bookingCount,
  }
}

export async function findCustomerDuplicateGroups(
  db: SupabaseClient
): Promise<CustomerDuplicateGroup[]> {
  const { data: customers, error } = await db
    .from('contacts')
    .select(
      'id, vorname, nachname, email, kundennummer, sevdesk_contact_id, user_id, status, onboarding_completed, created_at'
    )
    .eq('contact_type', 'customer')
    .not('email', 'is', null)

  if (error) throw new Error(error.message)

  const grouped = new Map<string, typeof customers>()
  for (const customer of customers || []) {
    if (!customer.email) continue
    const normalizedEmail = normalizeCustomerEmail(customer.email)
    const bucket = grouped.get(normalizedEmail) || []
    bucket.push(customer)
    grouped.set(normalizedEmail, bucket)
  }

  const duplicateGroups: CustomerDuplicateGroup[] = []

  for (const [email, groupCustomers] of grouped.entries()) {
    if (groupCustomers.length < 2) continue

    const summaries = await Promise.all(
      groupCustomers.map(async (customer) => {
        const summary = await loadCustomerMergeSummary(db, customer.id)
        if (!summary) {
          throw new Error(`Kunde ${customer.id} konnte nicht geladen werden`)
        }
        return summary
      })
    )

    const portalUserIds = new Set(
      summaries.map((customer) => customer.user_id).filter(Boolean) as string[]
    )
    const mergeable = portalUserIds.size <= 1
    const { targetId, sourceId } = suggestCustomerMergePair(summaries)

    duplicateGroups.push({
      kind: portalUserIds.size > 1 ? 'key_conflict' : 'email_duplicate',
      email,
      customers: summaries,
      suggestedTargetId: mergeable ? targetId : null,
      suggestedSourceId: mergeable ? sourceId : null,
      mergeable,
      reason: mergeable
        ? null
        : 'Zwei unterschiedliche Portal-Konten mit derselben E-Mail – bitte manuell klären.',
    })
  }

  duplicateGroups.sort((left, right) => left.email.localeCompare(right.email, 'de'))
  return duplicateGroups
}

async function reassignCustomerRelations(
  db: SupabaseClient,
  sourceCustomerId: string,
  targetCustomerId: string
): Promise<void> {
  const simpleUpdates: Array<{ table: string; column?: string }> = [
    { table: 'pets' },
    { table: 'documents' },
    { table: 'bookings' },
    { table: 'booking_request_groups' },
    { table: 'pet_photos' },
    { table: 'impfpass_upload_sessions' },
    { table: 'pet_care_plan_changes' },
    { table: 'signature_sessions' },
    { table: 'springer_registrations' },
    { table: 'daycare_interval_requests' },
    { table: 'springer_offers' },
    { table: 'onboarding_tokens' },
  ]

  for (const { table, column = 'customer_id' } of simpleUpdates) {
    const { error } = await db
      .from(table)
      .update({ [column]: targetCustomerId })
      .eq(column, sourceCustomerId)

    if (error && !/Could not find the table|relation .* does not exist/i.test(error.message)) {
      throw new Error(error.message)
    }
  }

  const contactUpdates: Array<{ table: string }> = [
    { table: 'notes' },
    { table: 'contact_emails' },
    { table: 'newsletter_send_logs' },
  ]

  for (const { table } of contactUpdates) {
    const { error } = await db
      .from(table)
      .update({ contact_id: targetCustomerId })
      .eq('contact_id', sourceCustomerId)

    if (error) throw new Error(error.message)
  }

  const { data: targetProperties, error: targetPropsError } = await db
    .from('property_values')
    .select('property_definition_id')
    .eq('entity_type', 'customer')
    .eq('entity_id', targetCustomerId)

  if (targetPropsError) throw new Error(targetPropsError.message)

  const targetPropertyIds = new Set((targetProperties || []).map((entry) => entry.property_definition_id))

  const { data: sourceProperties, error: sourcePropsError } = await db
    .from('property_values')
    .select('id, property_definition_id')
    .eq('entity_type', 'customer')
    .eq('entity_id', sourceCustomerId)

  if (sourcePropsError) throw new Error(sourcePropsError.message)

  for (const property of sourceProperties || []) {
    if (!targetPropertyIds.has(property.property_definition_id)) {
      const { error } = await db
        .from('property_values')
        .update({ entity_id: targetCustomerId })
        .eq('id', property.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await db.from('property_values').delete().eq('id', property.id)
      if (error) throw new Error(error.message)
    }
  }

  const { data: targetPrices, error: targetPricesError } = await db
    .from('customer_prices')
    .select('price_id')
    .eq('customer_id', targetCustomerId)

  if (targetPricesError) throw new Error(targetPricesError.message)

  const targetPriceIds = new Set((targetPrices || []).map((entry) => entry.price_id))

  const { data: sourcePrices, error: sourcePricesError } = await db
    .from('customer_prices')
    .select('id, price_id')
    .eq('customer_id', sourceCustomerId)

  if (sourcePricesError) throw new Error(sourcePricesError.message)

  for (const price of sourcePrices || []) {
    if (!targetPriceIds.has(price.price_id)) {
      const { error } = await db
        .from('customer_prices')
        .update({ customer_id: targetCustomerId })
        .eq('id', price.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await db.from('customer_prices').delete().eq('id', price.id)
      if (error) throw new Error(error.message)
    }
  }

  const { data: targetEmailChange, error: targetEmailChangeError } = await db
    .from('customer_email_change_requests')
    .select('id')
    .eq('customer_id', targetCustomerId)
    .maybeSingle()

  if (targetEmailChangeError) throw new Error(targetEmailChangeError.message)

  if (targetEmailChange) {
    const { error } = await db
      .from('customer_email_change_requests')
      .delete()
      .eq('customer_id', sourceCustomerId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await db
      .from('customer_email_change_requests')
      .update({ customer_id: targetCustomerId })
      .eq('customer_id', sourceCustomerId)
    if (error && !/Could not find the table|relation .* does not exist/i.test(error.message)) {
      throw new Error(error.message)
    }
  }
}

export async function mergeCustomers(options: {
  db: SupabaseClient
  targetCustomerId: string
  sourceCustomerId: string
  adminUserId: string
  adminEmail: string
}): Promise<{ targetCustomerId: string; sourceCustomerId: string }> {
  const { data: targetCustomer, error: targetError } = await options.db
    .from('contacts')
    .select('*')
    .eq('id', options.targetCustomerId)
    .single()

  if (targetError || !targetCustomer) {
    throw new CustomerMergeError('Ziel-Kunde nicht gefunden')
  }

  const { data: sourceCustomer, error: sourceError } = await options.db
    .from('contacts')
    .select('*')
    .eq('id', options.sourceCustomerId)
    .single()

  if (sourceError || !sourceCustomer) {
    throw new CustomerMergeError('Quell-Kunde nicht gefunden')
  }

  assertCustomerMergeAllowed(targetCustomer, sourceCustomer)

  await reassignCustomerRelations(options.db, options.sourceCustomerId, options.targetCustomerId)

  const updates = computeMergedCustomerFields(targetCustomer, sourceCustomer)
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await options.db
      .from('contacts')
      .update(updates)
      .eq('id', options.targetCustomerId)

    if (updateError) throw new Error(updateError.message)
  }

  const mergeNote = buildCustomerMergeSystemNote(sourceCustomer, options.adminEmail)
  const { error: noteError } = await options.db.from('notes').insert({
    contact_id: options.targetCustomerId,
    note: mergeNote,
    created_by: options.adminUserId,
  })

  if (noteError) throw new Error(noteError.message)

  const { error: deleteError } = await options.db
    .from('contacts')
    .delete()
    .eq('id', options.sourceCustomerId)

  if (deleteError) throw new Error(deleteError.message)

  return {
    targetCustomerId: options.targetCustomerId,
    sourceCustomerId: options.sourceCustomerId,
  }
}
