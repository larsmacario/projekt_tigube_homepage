import type { SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

import { sendOnboardingEmail, type EmailDelivery } from '@/lib/email'
import { updateOnboardingEmailStatus } from '@/lib/onboarding-email'

const ONBOARDING_TOKEN_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000

export interface OnboardingInviteResult {
  customerId: string
  email: string
  onboardingUrl: string
  emailDelivery: EmailDelivery
}

export function buildOnboardingUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}/onboarding/${token}`
}

export function resolveRequestBaseUrl(request: Request): string {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  return `${protocol}://${host}`
}

async function invalidateOpenTokens(db: SupabaseClient, customerId: string): Promise<void> {
  await db
    .from('onboarding_tokens')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('customer_id', customerId)
    .eq('used', false)
}

async function triggerOnboardingWebhook(options: {
  db: SupabaseClient
  customerId: string
  onboardingUrl: string
}): Promise<void> {
  const webhookUrl = process.env.ONBOARDING_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    const { data: contactRow } = await options.db
      .from('contacts')
      .select('*')
      .eq('id', options.customerId)
      .single()

    const webhookPayload = {
      event: 'onboarding_link_created',
      customer: contactRow
        ? {
            id: contactRow.id,
            name: contactRow.nachname,
            vorname: contactRow.vorname,
            email: contactRow.email,
            phone: contactRow.telefonnummer,
            status: contactRow.status,
          }
        : {},
      onboarding_url: options.onboardingUrl,
      timestamp: new Date().toISOString(),
    }

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error('Webhook-Fehler:', webhookResponse.status, errorText)
    }
  } catch (webhookError) {
    console.error('Fehler beim Senden des Webhooks:', webhookError)
  }
}

export async function sendOnboardingInviteForCustomer(options: {
  db: SupabaseClient
  customerId: string
  baseUrl: string
}): Promise<OnboardingInviteResult> {
  const { data: customer, error } = await options.db
    .from('contacts')
    .select('id, vorname, nachname, email, onboarding_completed, contact_type')
    .eq('id', options.customerId)
    .eq('contact_type', 'customer')
    .single()

  if (error || !customer) {
    throw new Error('Kunde nicht gefunden')
  }

  if (customer.onboarding_completed) {
    throw new Error('Onboarding ist bereits abgeschlossen')
  }

  if (!customer.email?.trim()) {
    throw new Error('Keine E-Mail-Adresse hinterlegt')
  }

  await invalidateOpenTokens(options.db, customer.id)

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + ONBOARDING_TOKEN_VALIDITY_MS).toISOString()

  const { error: tokenError } = await options.db.from('onboarding_tokens').insert({
    customer_id: customer.id,
    token,
    expires_at: expiresAt,
    used: false,
  })

  if (tokenError) {
    throw new Error(tokenError.message || 'Onboarding-Token konnte nicht erstellt werden')
  }

  const onboardingUrl = buildOnboardingUrl(options.baseUrl, token)
  const emailDelivery = await sendOnboardingEmail({
    email: customer.email.trim(),
    name: [customer.vorname, customer.nachname].filter(Boolean).join(' '),
    onboardingUrl,
  })

  await updateOnboardingEmailStatus(options.db, customer.id, emailDelivery)

  await triggerOnboardingWebhook({
    db: options.db,
    customerId: customer.id,
    onboardingUrl,
  })

  return {
    customerId: customer.id,
    email: customer.email.trim(),
    onboardingUrl,
    emailDelivery,
  }
}

export interface BulkOnboardingInviteResult {
  sent: Array<{ customerId: string; email: string }>
  failed: Array<{ customerId: string; error: string }>
}

export async function sendOnboardingInvitesForCustomers(options: {
  db: SupabaseClient
  customerIds: string[]
  baseUrl: string
}): Promise<BulkOnboardingInviteResult> {
  const sent: BulkOnboardingInviteResult['sent'] = []
  const failed: BulkOnboardingInviteResult['failed'] = []

  for (const customerId of options.customerIds) {
    try {
      const result = await sendOnboardingInviteForCustomer({
        db: options.db,
        customerId,
        baseUrl: options.baseUrl,
      })
      sent.push({ customerId, email: result.email })
    } catch (error) {
      failed.push({
        customerId,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      })
    }
  }

  return { sent, failed }
}
