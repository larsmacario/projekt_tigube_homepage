import type { SupabaseClient } from '@supabase/supabase-js'
import type { Contact, NewsletterRecipientConfig } from '@/lib/types'

export const NEWSLETTER_GROUP_OPTIONS = [
  { id: 'all_contacts', label: 'Alle Kontakte' },
  { id: 'customers', label: 'Alle Kunden' },
  { id: 'active_customers', label: 'Aktive Kunden' },
  { id: 'leads', label: 'Leads' },
  { id: 'lost', label: 'Verlorene Kontakte' },
  { id: 'waitlist', label: 'Warteliste' },
] as const

export type NewsletterGroupId = (typeof NEWSLETTER_GROUP_OPTIONS)[number]['id']

type ContactRow = Pick<Contact, 'id' | 'email' | 'vorname' | 'nachname' | 'contact_type' | 'status' | 'newsletter_unsubscribed_at'>

export async function resolveNewsletterRecipients(
  adminClient: SupabaseClient,
  config: NewsletterRecipientConfig
): Promise<ContactRow[]> {
  const groups = config.groups || []
  const manualIds = config.contactIds || []
  const recipients = new Map<string, ContactRow>()

  for (const groupId of groups) {
    const rows = await fetchGroupContacts(adminClient, groupId)
    for (const row of rows) {
      if (row.email?.trim()) {
        recipients.set(row.id, row)
      }
    }
  }

  if (manualIds.length > 0) {
    const { data } = await adminClient
      .from('contacts')
      .select('id, email, vorname, nachname, contact_type, status, newsletter_unsubscribed_at')
      .in('id', manualIds)

    for (const row of (data || []) as ContactRow[]) {
      if (row.email?.trim() && !row.newsletter_unsubscribed_at) {
        recipients.set(row.id, row)
      }
    }
  }

  return Array.from(recipients.values()).filter((row) => !row.newsletter_unsubscribed_at)
}

async function fetchGroupContacts(adminClient: SupabaseClient, groupId: string): Promise<ContactRow[]> {
  let query = adminClient
    .from('contacts')
    .select('id, email, vorname, nachname, contact_type, status, newsletter_unsubscribed_at')
    .not('email', 'is', null)
    .is('newsletter_unsubscribed_at', null)

  switch (groupId) {
    case 'customers':
      query = query.eq('contact_type', 'customer')
      break
    case 'active_customers':
      query = query.eq('contact_type', 'customer').eq('status', 'active')
      break
    case 'leads':
      query = query.eq('contact_type', 'lead')
      break
    case 'lost':
      query = query.eq('contact_type', 'lost')
      break
    case 'waitlist':
      query = query.eq('contact_type', 'waitlist')
      break
    case 'all_contacts':
    default:
      break
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as ContactRow[]
}

export function formatContactLabel(contact: Pick<Contact, 'vorname' | 'nachname' | 'email'>): string {
  const name = [contact.vorname, contact.nachname].filter(Boolean).join(' ')
  return name ? `${name} (${contact.email})` : contact.email
}
