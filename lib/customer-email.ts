import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const customerEmailSchema = z.string().trim().toLowerCase().email('Bitte gib eine gültige E-Mail-Adresse ein.')

export class CustomerEmailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CustomerEmailError'
  }
}

export function normalizeCustomerEmail(value: unknown): string {
  const parsed = customerEmailSchema.safeParse(value)
  if (!parsed.success) {
    throw new CustomerEmailError(parsed.error.issues[0]?.message || 'Bitte gib eine gültige E-Mail-Adresse ein.')
  }
  return parsed.data
}

export async function assertCustomerEmailAvailable(options: {
  db: SupabaseClient
  email: string
  customerId?: string
  authUserId?: string | null
}): Promise<void> {
  const normalizedEmail = normalizeCustomerEmail(options.email)

  const { data: customers, error: customerError } = await options.db
    .from('contacts')
    .select('id')
    .eq('contact_type', 'customer')
    .ilike('email', normalizedEmail)

  if (customerError) throw new Error(customerError.message)
  if ((customers || []).some((customer) => customer.id !== options.customerId)) {
    throw new CustomerEmailError('Ein Kunde mit dieser E-Mail-Adresse existiert bereits.')
  }

  const { data: users, error: userError } = await options.db
    .from('users')
    .select('id')
    .ilike('email', normalizedEmail)

  if (userError) throw new Error(userError.message)
  if ((users || []).some((user) => user.id !== options.authUserId)) {
    throw new CustomerEmailError('Diese E-Mail-Adresse wird bereits für ein Portal-Konto verwendet.')
  }

  const { data: pendingChanges, error: pendingError } = await options.db
    .from('customer_email_change_requests')
    .select('customer_id')
    .ilike('requested_email', normalizedEmail)

  if (pendingError) throw new Error(pendingError.message)
  if ((pendingChanges || []).some((change) => change.customer_id !== options.customerId)) {
    throw new CustomerEmailError('Diese E-Mail-Adresse ist bereits für eine ausstehende Änderung reserviert.')
  }
}
