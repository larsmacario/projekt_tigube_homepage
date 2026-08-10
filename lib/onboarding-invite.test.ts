import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/email', () => ({
  sendOnboardingEmail: vi.fn(),
}))

vi.mock('@/lib/onboarding-email', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/onboarding-email')>()
  return {
    ...actual,
    updateOnboardingEmailStatus: vi.fn(),
  }
})

import { sendOnboardingEmail } from '@/lib/email'
import { updateOnboardingEmailStatus } from '@/lib/onboarding-email'
import { sendOnboardingInviteForCustomer } from '@/lib/onboarding-invite'

function createMockDb(options: {
  customer?: Record<string, unknown> | null
  tokenInsertError?: string | null
}) {
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = []

  const db = {
    from: vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn(async () => {
          if (table === 'contacts') {
            if (!options.customer) {
              return { data: null, error: { message: 'not found' } }
            }
            return { data: options.customer, error: null }
          }
          return { data: null, error: null }
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          updates.push({ table, payload })
          return chain
        }),
        insert: vi.fn(() => ({
          ...chain,
          single: vi.fn(async () => {
            if (table === 'onboarding_tokens' && options.tokenInsertError) {
              return { data: null, error: { message: options.tokenInsertError } }
            }
            return { data: { id: 'token-1' }, error: null }
          }),
        })),
      }
      return chain
    }),
    updates,
  }

  return db
}

describe('sendOnboardingInviteForCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sendOnboardingEmail).mockResolvedValue({ status: 'sent', error: null })
  })

  it('speichert den Versandstatus bei erfolgreichem Mailversand', async () => {
    const db = createMockDb({
      customer: {
        id: 'cust-1',
        vorname: 'Anna',
        nachname: 'Muster',
        email: 'anna@example.com',
        onboarding_completed: false,
        contact_type: 'customer',
      },
    })

    await sendOnboardingInviteForCustomer({
      db: db as never,
      customerId: 'cust-1',
      baseUrl: 'https://example.com',
    })

    expect(updateOnboardingEmailStatus).toHaveBeenCalledWith(
      db,
      'cust-1',
      { status: 'sent', error: null }
    )
  })

  it('speichert den Fehlerstatus bei SMTP-Fehler', async () => {
    vi.mocked(sendOnboardingEmail).mockResolvedValue({
      status: 'failed',
      error: 'SMTP timeout',
    })

    const db = createMockDb({
      customer: {
        id: 'cust-2',
        vorname: 'Max',
        nachname: 'Test',
        email: 'max@example.com',
        onboarding_completed: false,
        contact_type: 'customer',
      },
    })

    await sendOnboardingInviteForCustomer({
      db: db as never,
      customerId: 'cust-2',
      baseUrl: 'https://example.com',
    })

    expect(updateOnboardingEmailStatus).toHaveBeenCalledWith(
      db,
      'cust-2',
      { status: 'failed', error: 'SMTP timeout' }
    )
  })
})
