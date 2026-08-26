import type { SupabaseClient } from '@supabase/supabase-js'

import { assertCustomerEmailAvailable, normalizeCustomerEmail } from '@/lib/customer-email'

export type CustomerEmailChangeSource = 'admin' | 'customer'
export type CustomerEmailChangeStatus =
  | 'awaiting_customer_confirmation'
  | 'awaiting_auth_confirmation'

export interface CustomerEmailChangeRequest {
  id: string
  customer_id: string
  requested_email: string
  source: CustomerEmailChangeSource
  status: CustomerEmailChangeStatus
  requested_by: string | null
  created_at: string
  updated_at: string
}

export async function getCustomerEmailChangeRequest(
  db: SupabaseClient,
  customerId: string
): Promise<CustomerEmailChangeRequest | null> {
  const { data, error } = await db
    .from('customer_email_change_requests')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as CustomerEmailChangeRequest | null
}

export async function createCustomerEmailChangeRequest(options: {
  db: SupabaseClient
  customerId: string
  authUserId?: string | null
  email: unknown
  requestedBy: string
  source: CustomerEmailChangeSource
  status: CustomerEmailChangeStatus
}): Promise<CustomerEmailChangeRequest> {
  const requestedEmail = normalizeCustomerEmail(options.email)
  await assertCustomerEmailAvailable({
    db: options.db,
    email: requestedEmail,
    customerId: options.customerId,
    authUserId: options.authUserId,
  })

  const { data, error } = await options.db
    .from('customer_email_change_requests')
    .upsert(
      {
        customer_id: options.customerId,
        requested_email: requestedEmail,
        requested_by: options.requestedBy,
        source: options.source,
        status: options.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'customer_id' }
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as CustomerEmailChangeRequest
}

export async function deleteCustomerEmailChangeRequest(options: {
  db: SupabaseClient
  customerId: string
  onlyBeforeAuthConfirmation?: boolean
}): Promise<void> {
  let query = options.db
    .from('customer_email_change_requests')
    .delete()
    .eq('customer_id', options.customerId)

  if (options.onlyBeforeAuthConfirmation) {
    query = query.eq('status', 'awaiting_customer_confirmation')
  }

  const { error } = await query
  if (error) throw new Error(error.message)
}

export async function setCustomerEmailChangeRequestStatus(options: {
  db: SupabaseClient
  customerId: string
  status: CustomerEmailChangeStatus
}): Promise<CustomerEmailChangeRequest> {
  const { data, error } = await options.db
    .from('customer_email_change_requests')
    .update({ status: options.status, updated_at: new Date().toISOString() })
    .eq('customer_id', options.customerId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as CustomerEmailChangeRequest
}

export async function reconcileConfirmedCustomerEmail(options: {
  db: SupabaseClient
  customerId: string
  authEmail: string | null | undefined
}): Promise<boolean> {
  if (!options.authEmail) return false
  const authEmail = normalizeCustomerEmail(options.authEmail)
  const request = await getCustomerEmailChangeRequest(options.db, options.customerId)
  if (!request || request.status !== 'awaiting_auth_confirmation' || request.requested_email !== authEmail) {
    return false
  }

  const { error } = await options.db.rpc('confirm_customer_email_change', {
    p_customer_id: options.customerId,
    p_email: authEmail,
  })
  if (error) throw new Error(error.message)
  return true
}
