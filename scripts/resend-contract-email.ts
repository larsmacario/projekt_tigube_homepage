/**
 * Einmaliger Nachversand einer Vertrags-Mail aus Supabase Storage.
 *
 * Ausführen:
 *   npx tsx scripts/resend-contract-email.ts gabriel-haaga@gmx.de
 *
 * Benötigt: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SMTP_* in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { sendStoredContractEmail } from '../lib/contract-email'

async function main() {
  const identifier = process.argv[2]
  if (!identifier) {
    throw new Error('Bitte Kunden-E-Mail oder UUID angeben.')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const query = supabase
    .from('contacts')
    .select('id, vorname, nachname, email, contract_signed')
    .eq('contact_type', 'customer')

  const { data: customer, error } = identifier.includes('@')
    ? await query.eq('email', identifier).maybeSingle()
    : await query.eq('id', identifier).maybeSingle()

  if (error) {
    throw error
  }

  if (!customer) {
    throw new Error(`Kein Kunde gefunden für: ${identifier}`)
  }

  if (!customer.contract_signed) {
    throw new Error(`Kunde ${customer.email} hat keinen unterzeichneten Vertrag.`)
  }

  const customerName = `${customer.vorname || ''} ${customer.nachname}`.trim()
  const delivery = await sendStoredContractEmail(supabase, {
    customerId: customer.id,
    email: customer.email,
    name: customerName,
  })

  if (delivery.status === 'failed') {
    throw new Error(delivery.error || 'Vertrags-Mail konnte nicht gesendet werden')
  }

  console.log(`Vertrags-Mail erfolgreich an ${customer.email} gesendet (Dokument: ${delivery.documentId}).`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
