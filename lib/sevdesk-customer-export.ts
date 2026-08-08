import type { SupabaseClient } from '@supabase/supabase-js'

import { createSevdeskContact } from '@/lib/sevdesk'
import type { Contact } from '@/lib/types'

export async function syncPortalCustomerToSevdesk(options: {
  db: SupabaseClient
  customerId: string
}): Promise<{ contactId: string; customerNumber: string; created: boolean }> {
  const { data: customer, error } = await options.db
    .from('contacts')
    .select('*')
    .eq('id', options.customerId)
    .eq('contact_type', 'customer')
    .single()

  if (error || !customer) {
    throw new Error('Kunde nicht gefunden')
  }

  const typedCustomer = customer as Contact

  if (typedCustomer.sevdesk_contact_id) {
    return {
      contactId: typedCustomer.sevdesk_contact_id,
      customerNumber: typedCustomer.kundennummer || '',
      created: false,
    }
  }

  if (!typedCustomer.nachname?.trim()) {
    throw new Error('Nachname fehlt für SevDesk-Export')
  }

  if (!typedCustomer.email?.trim()) {
    throw new Error('E-Mail fehlt für SevDesk-Export')
  }

  try {
    const created = await createSevdeskContact({
      vorname: typedCustomer.vorname,
      nachname: typedCustomer.nachname,
      email: typedCustomer.email,
      telefonnummer: typedCustomer.telefonnummer,
      kundennummer: typedCustomer.kundennummer,
      strasse: typedCustomer.strasse,
      hausnummer: typedCustomer.hausnummer,
      plz: typedCustomer.plz,
      ort: typedCustomer.ort,
    })

    const { error: updateError } = await options.db
      .from('contacts')
      .update({
        sevdesk_contact_id: created.contactId,
        kundennummer: typedCustomer.kundennummer?.trim() || created.customerNumber,
        sevdesk_synced_at: new Date().toISOString(),
        sevdesk_sync_error: null,
      })
      .eq('id', options.customerId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return {
      contactId: created.contactId,
      customerNumber: typedCustomer.kundennummer?.trim() || created.customerNumber,
      created: true,
    }
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : 'SevDesk-Export fehlgeschlagen'
    await options.db
      .from('contacts')
      .update({
        sevdesk_sync_error: message,
      })
      .eq('id', options.customerId)
    throw syncError
  }
}
