import type { SupabaseClient } from '@supabase/supabase-js'

import {
  CUSTOMER_DOCUMENTS_BUCKET,
  normalizeCustomerDocumentStoragePath,
} from '@/lib/customer-documents'
import { deletePetPhotoStorageFiles } from '@/lib/portal-customer'

/** Aufbewahrungsfrist für Rechnungsbelege gemäß §147 AO */
export const INVOICE_RETENTION_YEARS = 10

/** Aufbewahrungsfrist für Geschäftsbriefe/Verträge gemäß §257 HGB */
export const CONTRACT_RETENTION_YEARS = 6

export const ACCOUNT_DELETION_CONFIRMATION = 'LÖSCHEN'

export class CustomerDeletionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CustomerDeletionError'
  }
}

export type CustomerRetentionReason = {
  invoices?: string
  contract?: string
}

export type CustomerDeletionPreview = {
  retentionUntil: string | null
  retentionActive: boolean
  retentionReasons: CustomerRetentionReason
  willAnonymize: boolean
  deletedItems: string[]
  retainedItems: string[]
}

export type CustomerDeletionResult = {
  mode: 'full' | 'anonymized'
  retentionUntil: string | null
  customerId: string
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setUTCFullYear(result.getUTCFullYear() + years)
  return result
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function computeCustomerRetentionUntil(options: {
  lastInvoiceSyncedAt: string | null
  contractSignedAt: string | null
}): { until: string | null; reasons: CustomerRetentionReason } {
  const candidates: Array<{ until: Date; reasonKey: keyof CustomerRetentionReason; label: string }> = []

  if (options.lastInvoiceSyncedAt) {
    candidates.push({
      until: addYears(new Date(options.lastInvoiceSyncedAt), INVOICE_RETENTION_YEARS),
      reasonKey: 'invoices',
      label: `Rechnungen (${INVOICE_RETENTION_YEARS} Jahre)`,
    })
  }

  if (options.contractSignedAt) {
    candidates.push({
      until: addYears(new Date(options.contractSignedAt), CONTRACT_RETENTION_YEARS),
      reasonKey: 'contract',
      label: `Betreuungsvertrag (${CONTRACT_RETENTION_YEARS} Jahre)`,
    })
  }

  if (candidates.length === 0) {
    return { until: null, reasons: {} }
  }

  const latest = candidates.reduce((current, candidate) =>
    candidate.until > current.until ? candidate : current
  )

  const reasons: CustomerRetentionReason = {}
  for (const candidate of candidates) {
    reasons[candidate.reasonKey] = candidate.label
  }

  return { until: toDateOnly(latest.until), reasons }
}

export function isRetentionActive(
  retentionUntil: string | null,
  referenceDate: Date = new Date()
): boolean {
  if (!retentionUntil) return false
  const end = new Date(`${retentionUntil}T23:59:59.999Z`)
  return end >= referenceDate
}

function buildDeletionPreview(
  retentionUntil: string | null,
  retentionReasons: CustomerRetentionReason,
  retentionActive: boolean
): CustomerDeletionPreview {
  const deletedItems = [
    'Name, Adresse, Telefonnummern und Notfallkontakt',
    'E-Mail-Adresse und Portal-Zugang',
    'Tierfotos, Impfpass- und Wurmtest-Dokumente',
    'Notizen, Springer-Anmeldungen und sonstige personenbezogene Nebendaten',
  ]

  const retainedItems: string[] = []
  if (retentionActive) {
    retainedItems.push('Buchungs- und Rechnungshistorie (anonymisiert)')
    if (retentionReasons.contract) {
      retainedItems.push('Unterschriebener Betreuungsvertrag')
    }
    retainedItems.push(
      retentionUntil
        ? `Aufbewahrung bis voraussichtlich ${formatGermanDate(retentionUntil)}`
        : 'Aufbewahrung bis zum Ablauf der gesetzlichen Frist'
    )
  }

  return {
    retentionUntil,
    retentionActive,
    retentionReasons,
    willAnonymize: retentionActive,
    deletedItems,
    retainedItems,
  }
}

function formatGermanDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}.${month}.${year}`
}

async function loadRetentionInputs(
  db: SupabaseClient,
  customerId: string
): Promise<{
  customer: {
    id: string
    user_id: string | null
    kundennummer: string | null
    contract_signed: boolean | null
    contract_signed_at: string | null
  }
  lastInvoiceSyncedAt: string | null
}> {
  const { data: customer, error: customerError } = await db
    .from('contacts')
    .select('id, user_id, kundennummer, contract_signed, contract_signed_at, status')
    .eq('id', customerId)
    .eq('contact_type', 'customer')
    .maybeSingle()

  if (customerError) throw new CustomerDeletionError(customerError.message)
  if (!customer) throw new CustomerDeletionError('Kunde nicht gefunden')
  if (customer.status === 'deleted') {
    throw new CustomerDeletionError('Dieses Konto wurde bereits gelöscht')
  }

  const { data: invoiceGroups, error: invoiceError } = await db
    .from('booking_request_groups')
    .select('sevdesk_invoice_synced_at')
    .eq('customer_id', customerId)
    .eq('sevdesk_invoice_sync_status', 'synced')
    .not('sevdesk_invoice_synced_at', 'is', null)
    .order('sevdesk_invoice_synced_at', { ascending: false })
    .limit(1)

  if (invoiceError) throw new CustomerDeletionError(invoiceError.message)

  return {
    customer,
    lastInvoiceSyncedAt: invoiceGroups?.[0]?.sevdesk_invoice_synced_at ?? null,
  }
}

export async function getCustomerDeletionPreview(
  db: SupabaseClient,
  customerId: string
): Promise<CustomerDeletionPreview> {
  const { customer, lastInvoiceSyncedAt } = await loadRetentionInputs(db, customerId)
  const contractSignedAt =
    customer.contract_signed && customer.contract_signed_at ? customer.contract_signed_at : null

  const { until, reasons } = computeCustomerRetentionUntil({
    lastInvoiceSyncedAt,
    contractSignedAt,
  })

  return buildDeletionPreview(until, reasons, isRetentionActive(until))
}

async function deleteStoragePaths(
  db: SupabaseClient,
  bucket: string,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  const { error } = await db.storage.from(bucket).remove(uniquePaths)
  if (error) {
    console.error(`Storage delete error (${bucket}):`, error)
  }
}

async function deletePropertyValues(db: SupabaseClient, customerId: string): Promise<void> {
  const { error } = await db
    .from('property_values')
    .delete()
    .eq('entity_type', 'customer')
    .eq('entity_id', customerId)
  if (error) throw new CustomerDeletionError(error.message)
}

async function deletePersonalAncillaryData(
  db: SupabaseClient,
  customerId: string
): Promise<void> {
  const customerIdTables = [
    'notes',
    'contact_emails',
    'signature_sessions',
    'springer_registrations',
    'springer_offers',
    'customer_email_change_requests',
    'onboarding_tokens',
    'impfpass_upload_sessions',
    'pet_care_plan_changes',
    'customer_prices',
  ] as const

  for (const table of customerIdTables) {
    const column = table === 'notes' || table === 'contact_emails' ? 'contact_id' : 'customer_id'
    const { error } = await db.from(table).delete().eq(column, customerId)
    if (error && !/Could not find the table|relation .* does not exist/i.test(error.message)) {
      throw new CustomerDeletionError(error.message)
    }
  }

  const { error: newsletterError } = await db
    .from('newsletter_send_logs')
    .delete()
    .eq('contact_id', customerId)
  if (newsletterError && !/Could not find the table|relation .* does not exist/i.test(newsletterError.message)) {
    throw new CustomerDeletionError(newsletterError.message)
  }

  const { error: daycareError } = await db
    .from('daycare_interval_requests')
    .delete()
    .eq('customer_id', customerId)
  if (daycareError && !/Could not find the table|relation .* does not exist/i.test(daycareError.message)) {
    throw new CustomerDeletionError(daycareError.message)
  }

  await deletePropertyValues(db, customerId)
}

async function deleteAllCustomerStorage(db: SupabaseClient, customerId: string): Promise<void> {
  const { data: documents, error: documentsError } = await db
    .from('documents')
    .select('file_path')
    .eq('customer_id', customerId)
  if (documentsError) throw new CustomerDeletionError(documentsError.message)

  const documentPaths = (documents || []).map((document) =>
    normalizeCustomerDocumentStoragePath(document.file_path)
  )

  const { data: photos, error: photosError } = await db
    .from('pet_photos')
    .select('file_path')
    .eq('customer_id', customerId)
  if (photosError) throw new CustomerDeletionError(photosError.message)

  await deleteStoragePaths(db, CUSTOMER_DOCUMENTS_BUCKET, documentPaths)
  await deletePetPhotoStorageFiles(
    db,
    (photos || []).map((photo) => photo.file_path)
  )
}

async function deleteAuthUser(db: SupabaseClient, authUserId: string | null): Promise<void> {
  if (!authUserId) return

  const { error: unlinkError } = await db
    .from('contacts')
    .update({ user_id: null })
    .eq('user_id', authUserId)
  if (unlinkError) throw new CustomerDeletionError(unlinkError.message)

  const { error: authError } = await db.auth.admin.deleteUser(authUserId)
  if (authError) {
    console.error('Auth user delete error:', authError)
  }
}

async function writeDeletionLog(
  db: SupabaseClient,
  options: {
    customerId: string
    kundennummer: string | null
    retentionUntil: string | null
    retentionReason: CustomerRetentionReason
    performedBy: string
    mode: 'full' | 'anonymized'
  }
): Promise<void> {
  const { error } = await db.from('customer_deletion_log').insert({
    customer_id: options.customerId,
    kundennummer: options.kundennummer,
    retention_until: options.retentionUntil,
    retention_reason: options.retentionReason,
    performed_by: options.performedBy,
    deletion_mode: options.mode,
  })
  if (error) throw new CustomerDeletionError(error.message)
}

async function deleteCustomerFully(
  db: SupabaseClient,
  customerId: string,
  authUserId: string | null
): Promise<void> {
  await deletePersonalAncillaryData(db, customerId)
  await deleteAllCustomerStorage(db, customerId)
  await deleteAuthUser(db, authUserId)

  const { error } = await db
    .from('contacts')
    .delete()
    .eq('id', customerId)
    .eq('contact_type', 'customer')
  if (error) throw new CustomerDeletionError(error.message)
}

async function scrubProtectedPet(
  db: SupabaseClient,
  petId: string,
  customerId: string
): Promise<void> {
  const { data: photos, error: photosError } = await db
    .from('pet_photos')
    .select('file_path')
    .eq('pet_id', petId)
    .eq('customer_id', customerId)
  if (photosError) throw new CustomerDeletionError(photosError.message)

  await deletePetPhotoStorageFiles(db, (photos || []).map((photo) => photo.file_path))

  const { error: deletePhotosError } = await db
    .from('pet_photos')
    .delete()
    .eq('pet_id', petId)
    .eq('customer_id', customerId)
  if (deletePhotosError) throw new CustomerDeletionError(deletePhotosError.message)

  const { error: updateError } = await db
    .from('pets')
    .update({
      wiedererkennungsmerkmal: null,
      besonderheiten: null,
      medikamente: null,
      futtermenge: null,
      care_plan: null,
      letzte_impfung: null,
      letzte_impfung_zusatz: null,
      letzte_stuhlprobe: null,
      naechste_stuhlprobe: null,
      intervall_impfung: null,
      intervall_entwurmung: null,
      deceased_at: null,
    })
    .eq('id', petId)
    .eq('customer_id', customerId)
  if (updateError) throw new CustomerDeletionError(updateError.message)
}

async function deletePetCompletely(
  db: SupabaseClient,
  petId: string,
  customerId: string
): Promise<void> {
  const { data: photos, error: photosError } = await db
    .from('pet_photos')
    .select('file_path')
    .eq('pet_id', petId)
    .eq('customer_id', customerId)
  if (photosError) throw new CustomerDeletionError(photosError.message)

  const { data: documents, error: documentsError } = await db
    .from('documents')
    .select('file_path')
    .eq('pet_id', petId)
    .eq('customer_id', customerId)
  if (documentsError) throw new CustomerDeletionError(documentsError.message)

  await deletePetPhotoStorageFiles(db, (photos || []).map((photo) => photo.file_path))
  await deleteStoragePaths(
    db,
    CUSTOMER_DOCUMENTS_BUCKET,
    (documents || []).map((document) => normalizeCustomerDocumentStoragePath(document.file_path))
  )

  const { error } = await db.from('pets').delete().eq('id', petId).eq('customer_id', customerId)
  if (error) throw new CustomerDeletionError(error.message)
}

async function anonymizeCustomerWithRetention(
  db: SupabaseClient,
  customerId: string,
  authUserId: string | null,
  retentionUntil: string | null,
  retentionReason: CustomerRetentionReason
): Promise<void> {
  const { data: pets, error: petsError } = await db
    .from('pets')
    .select('id')
    .eq('customer_id', customerId)
  if (petsError) throw new CustomerDeletionError(petsError.message)

  const { data: bookedPetRows, error: bookedPetsError } = await db
    .from('bookings')
    .select('pet_id')
    .eq('customer_id', customerId)
  if (bookedPetsError) throw new CustomerDeletionError(bookedPetsError.message)

  const protectedPetIds = new Set((bookedPetRows || []).map((row) => row.pet_id))

  for (const pet of pets || []) {
    if (protectedPetIds.has(pet.id)) {
      await scrubProtectedPet(db, pet.id, customerId)
    } else {
      await deletePetCompletely(db, pet.id, customerId)
    }
  }

  const { data: removableDocuments, error: removableDocumentsError } = await db
    .from('documents')
    .select('id, file_path')
    .eq('customer_id', customerId)
    .neq('document_type', 'vertrag')
  if (removableDocumentsError) throw new CustomerDeletionError(removableDocumentsError.message)

  await deleteStoragePaths(
    db,
    CUSTOMER_DOCUMENTS_BUCKET,
    (removableDocuments || []).map((document) =>
      normalizeCustomerDocumentStoragePath(document.file_path)
    )
  )

  if ((removableDocuments || []).length > 0) {
    const { error: deleteDocumentsError } = await db
      .from('documents')
      .delete()
      .in(
        'id',
        removableDocuments!.map((document) => document.id)
      )
    if (deleteDocumentsError) throw new CustomerDeletionError(deleteDocumentsError.message)
  }

  await deletePersonalAncillaryData(db, customerId)

  const now = new Date().toISOString()
  const placeholderEmail = `deleted-${customerId}@geloescht.invalid`

  const { error: anonymizeError } = await db
    .from('contacts')
    .update({
      vorname: null,
      nachname: 'Gelöschter Kunde',
      email: placeholderEmail,
      telefonnummer: '0000000000',
      telefon_2: null,
      strasse: null,
      hausnummer: null,
      plz: null,
      ort: null,
      notfall_kontakt_name: null,
      notfallnummer: null,
      pet: null,
      anzahl_tiere: null,
      tiernamen: null,
      futtermenge: null,
      medikamente: null,
      besonderheiten: null,
      intervall_impfung: null,
      intervall_entwurmung: null,
      ip_address: null,
      user_agent: null,
      properties: {},
      assigned_to: null,
      user_id: null,
      datenschutz: false,
      newsletter_unsubscribed_at: null,
      email_internal_status: null,
      email_internal_error: null,
      email_confirmation_status: null,
      email_confirmation_error: null,
      contract_email_status: null,
      contract_email_error: null,
      contract_email_sent_at: null,
      onboarding_email_status: null,
      onboarding_email_error: null,
      onboarding_email_sent_at: null,
      sevdesk_sync_error: null,
      status: 'deleted',
      deleted_at: now,
      anonymized_at: now,
      deletion_retention_until: retentionUntil,
    })
    .eq('id', customerId)
    .eq('contact_type', 'customer')
  if (anonymizeError) throw new CustomerDeletionError(anonymizeError.message)

  await deleteAuthUser(db, authUserId)
}

export async function deleteOrAnonymizeCustomerAccount(options: {
  db: SupabaseClient
  customerId: string
  performedBy: string
}): Promise<CustomerDeletionResult> {
  const { customer, lastInvoiceSyncedAt } = await loadRetentionInputs(options.db, options.customerId)
  const contractSignedAt =
    customer.contract_signed && customer.contract_signed_at ? customer.contract_signed_at : null

  const { until, reasons } = computeCustomerRetentionUntil({
    lastInvoiceSyncedAt,
    contractSignedAt,
  })
  const retentionActive = isRetentionActive(until)
  const authUserId = customer.user_id

  if (retentionActive) {
    await anonymizeCustomerWithRetention(
      options.db,
      options.customerId,
      authUserId,
      until,
      reasons
    )

    await writeDeletionLog(options.db, {
      customerId: options.customerId,
      kundennummer: customer.kundennummer,
      retentionUntil: until,
      retentionReason: reasons,
      performedBy: options.performedBy,
      mode: 'anonymized',
    })
  } else {
    await deleteCustomerFully(options.db, options.customerId, authUserId)

    await writeDeletionLog(options.db, {
      customerId: options.customerId,
      kundennummer: customer.kundennummer,
      retentionUntil: until,
      retentionReason: reasons,
      performedBy: options.performedBy,
      mode: 'full',
    })
  }

  return {
    mode: retentionActive ? 'anonymized' : 'full',
    retentionUntil: until,
    customerId: options.customerId,
  }
}
