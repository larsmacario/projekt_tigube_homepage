import type { SupabaseClient } from '@supabase/supabase-js'

import { mapSevdeskContactToPortalFields } from '@/lib/sevdesk-contact-mapper'
import {
  contactHasTag,
  listAllSevdeskContacts,
  loadSevdeskContactDetail,
  SEVDESK_ACTIVE_CUSTOMER_TAG,
  updateSevdeskCustomerImportSummary,
} from '@/lib/sevdesk'
import type { SevdeskCustomerImportSummary } from '@/lib/types'
import { ONBOARDING_EMAIL_STATUS_RESET } from '@/lib/onboarding-email'

type MappedSevdeskCustomer = ReturnType<typeof mapSevdeskContactToPortalFields>

const IMPORT_PLACEHOLDER_FIELDS = {
  service: 'import',
  message: 'Import aus SevDesk',
  availability: '-',
  contact_type: 'customer' as const,
}

function buildStammdatenPayload(mapped: MappedSevdeskCustomer, sevdeskContactId: string) {
  return {
    nachname: mapped.nachname,
    vorname: mapped.vorname,
    email: mapped.email,
    telefonnummer: mapped.telefonnummer,
    kundennummer: mapped.kundennummer,
    strasse: mapped.strasse,
    hausnummer: mapped.hausnummer,
    plz: mapped.plz,
    ort: mapped.ort,
    sevdesk_contact_id: sevdeskContactId,
    sevdesk_synced_at: new Date().toISOString(),
    sevdesk_sync_error: null,
  }
}

export function buildSevdeskImportCreatePayload(
  mapped: MappedSevdeskCustomer,
  sevdeskContactId: string
) {
  return {
    ...IMPORT_PLACEHOLDER_FIELDS,
    ...buildStammdatenPayload(mapped, sevdeskContactId),
    status: 'pending' as const,
    datenschutz: false,
    onboarding_completed: false,
    ...ONBOARDING_EMAIL_STATUS_RESET,
  }
}

export function buildSevdeskImportUpdatePayload(
  mapped: MappedSevdeskCustomer,
  sevdeskContactId: string,
  existing: { user_id?: string | null }
) {
  const payload = {
    ...buildStammdatenPayload(mapped, sevdeskContactId),
    service: 'import',
  }

  if (!existing.user_id) {
    return {
      ...payload,
      status: 'pending' as const,
      datenschutz: false,
      onboarding_completed: false,
      contract_signed: false,
      ...ONBOARDING_EMAIL_STATUS_RESET,
    }
  }

  return payload
}

export async function importActiveSevdeskCustomers(options: {
  db: SupabaseClient
  initiatedBy?: string | null
}): Promise<SevdeskCustomerImportSummary> {
  const summary: SevdeskCustomerImportSummary = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    skippedReasons: [],
    failures: [],
  }

  const { data: run, error: runError } = await options.db
    .from('sevdesk_sync_runs')
    .insert({
      run_type: 'customer_import',
      initiated_by: options.initiatedBy ?? null,
      summary,
    })
    .select('id')
    .single()

  if (runError) {
    throw new Error(runError.message || 'Import-Lauf konnte nicht gestartet werden')
  }

  try {
    const contacts = await listAllSevdeskContacts()

    for (const contact of contacts) {
      const customerNumber = contact.customerNumber?.trim() || null

      try {
        const isActive = await contactHasTag(contact, SEVDESK_ACTIVE_CUSTOMER_TAG)
        if (!isActive) {
          summary.skipped += 1
          summary.skippedReasons?.push({
            customerNumber,
            reason: `Tag „${SEVDESK_ACTIVE_CUSTOMER_TAG}“ fehlt`,
          })
          continue
        }

        const detail = await loadSevdeskContactDetail(contact)
        const mapped = mapSevdeskContactToPortalFields(detail)

        const existingByNumber = await options.db
          .from('contacts')
          .select('id, sevdesk_contact_id, user_id')
          .eq('contact_type', 'customer')
          .eq('kundennummer', mapped.kundennummer)
          .maybeSingle()

        const existingBySevdesk = await options.db
          .from('contacts')
          .select('id, kundennummer, user_id')
          .eq('contact_type', 'customer')
          .eq('sevdesk_contact_id', detail.id)
          .maybeSingle()

        if (
          existingByNumber.data &&
          existingBySevdesk.data &&
          existingByNumber.data.id !== existingBySevdesk.data.id
        ) {
          summary.failed += 1
          summary.failures?.push({
            customerNumber,
            reason: 'Kundennummer und SevDesk-ID verweisen auf unterschiedliche Portal-Kunden',
          })
          continue
        }

        const existing = existingByNumber.data ?? existingBySevdesk.data

        if (existing) {
          const payload = buildSevdeskImportUpdatePayload(mapped, detail.id, existing)
          const { error } = await options.db
            .from('contacts')
            .update(payload)
            .eq('id', existing.id)

          if (error) {
            throw new Error(error.message)
          }
          summary.updated += 1
        } else {
          const payload = buildSevdeskImportCreatePayload(mapped, detail.id)
          const { error } = await options.db.from('contacts').insert(payload)
          if (error) {
            throw new Error(error.message)
          }
          summary.created += 1
        }
      } catch (error) {
        summary.failed += 1
        summary.failures?.push({
          customerNumber,
          reason: error instanceof Error ? error.message : 'Unbekannter Fehler',
        })
      }
    }

    await updateSevdeskCustomerImportSummary(summary)
    await options.db
      .from('sevdesk_sync_runs')
      .update({
        finished_at: new Date().toISOString(),
        summary,
      })
      .eq('id', run.id)

    return summary
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import fehlgeschlagen'
    await options.db
      .from('sevdesk_sync_runs')
      .update({
        finished_at: new Date().toISOString(),
        error_message: message,
        summary,
      })
      .eq('id', run.id)
    throw error
  }
}
