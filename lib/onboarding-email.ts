import type { SupabaseClient } from '@supabase/supabase-js'

import type { EmailDelivery } from '@/lib/email'

export async function updateOnboardingEmailStatus(
  supabase: SupabaseClient,
  customerId: string,
  delivery: EmailDelivery
): Promise<void> {
  const { error } = await supabase
    .from('contacts')
    .update({
      onboarding_email_status: delivery.status,
      onboarding_email_error: delivery.error,
      onboarding_email_sent_at: delivery.status === 'sent' ? new Date().toISOString() : null,
    })
    .eq('id', customerId)

  if (error) {
    console.error('Onboarding-Mail-Status konnte nicht gespeichert werden:', error)
  }
}

export const ONBOARDING_EMAIL_STATUS_RESET = {
  onboarding_email_status: null,
  onboarding_email_error: null,
  onboarding_email_sent_at: null,
} as const
