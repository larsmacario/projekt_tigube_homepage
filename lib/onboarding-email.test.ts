import { describe, expect, it, vi, beforeEach } from 'vitest'

import { updateOnboardingEmailStatus } from '@/lib/onboarding-email'

describe('updateOnboardingEmailStatus', () => {
  it('schreibt sent-Status mit Zeitstempel in contacts', async () => {
    const eq = vi.fn(async () => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const db = { from: vi.fn(() => ({ update })) }

    await updateOnboardingEmailStatus(db as never, 'cust-3', {
      status: 'sent',
      error: null,
    })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        onboarding_email_status: 'sent',
        onboarding_email_error: null,
        onboarding_email_sent_at: expect.any(String),
      })
    )
    expect(eq).toHaveBeenCalledWith('id', 'cust-3')
  })

  it('setzt sent_at auf null bei fehlgeschlagenem Versand', async () => {
    const eq = vi.fn(async () => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const db = { from: vi.fn(() => ({ update })) }

    await updateOnboardingEmailStatus(db as never, 'cust-4', {
      status: 'failed',
      error: 'SMTP error',
    })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        onboarding_email_status: 'failed',
        onboarding_email_error: 'SMTP error',
        onboarding_email_sent_at: null,
      })
    )
  })
})
