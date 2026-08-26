import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/customer-email', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/customer-email')>()
  return {
    ...actual,
    assertCustomerEmailAvailable: vi.fn(async () => undefined),
  }
})

import { assertCustomerEmailAvailable } from '@/lib/customer-email'
import {
  createCustomerEmailChangeRequest,
  reconcileConfirmedCustomerEmail,
} from '@/lib/customer-email-change'

function createChangeDb(options: {
  request?: Record<string, unknown> | null
  upsertError?: string | null
  rpcError?: string | null
}) {
  const rpc = vi.fn(async () => ({ data: null, error: options.rpcError ? { message: options.rpcError } : null }))

  const db = {
    from: vi.fn((table: string) => {
      if (table !== 'customer_email_change_requests') {
        throw new Error(`Unexpected table ${table}`)
      }

      const chain: Record<string, unknown> = {}
      chain.select = vi.fn(() => chain)
      chain.eq = vi.fn(() => chain)
      chain.maybeSingle = vi.fn(async () => ({ data: options.request ?? null, error: null }))
      chain.single = vi.fn(async () => ({
        data: options.request || {
          id: 'req-1',
          customer_id: 'c-1',
          requested_email: 'neu@example.com',
          source: 'customer',
          status: 'awaiting_auth_confirmation',
          requested_by: 'u-1',
          created_at: '2026-08-26T00:00:00.000Z',
          updated_at: '2026-08-26T00:00:00.000Z',
        },
        error: options.upsertError ? { message: options.upsertError } : null,
      }))
      chain.upsert = vi.fn(() => chain)
      return chain
    }),
    rpc,
  }

  return db
}

describe('customer-email-change', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('legt eine normalisierte Änderungsanfrage an', async () => {
    const db = createChangeDb({
      request: {
        id: 'req-1',
        customer_id: 'c-1',
        requested_email: 'neu@example.com',
        source: 'admin',
        status: 'awaiting_customer_confirmation',
        requested_by: 'admin-1',
        created_at: '2026-08-26T00:00:00.000Z',
        updated_at: '2026-08-26T00:00:00.000Z',
      },
    })

    const result = await createCustomerEmailChangeRequest({
      db: db as never,
      customerId: 'c-1',
      authUserId: 'u-1',
      email: '  Neu@Example.com ',
      requestedBy: 'admin-1',
      source: 'admin',
      status: 'awaiting_customer_confirmation',
    })

    expect(assertCustomerEmailAvailable).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'neu@example.com',
        customerId: 'c-1',
        authUserId: 'u-1',
      })
    )
    expect(result.requested_email).toBe('neu@example.com')
    expect(result.status).toBe('awaiting_customer_confirmation')
  })

  it('synchronisiert erst nach Auth-Bestätigung atomar', async () => {
    const matching = createChangeDb({
      request: {
        id: 'req-1',
        customer_id: 'c-1',
        requested_email: 'neu@example.com',
        source: 'customer',
        status: 'awaiting_auth_confirmation',
        requested_by: 'u-1',
        created_at: '2026-08-26T00:00:00.000Z',
        updated_at: '2026-08-26T00:00:00.000Z',
      },
    })

    await expect(
      reconcileConfirmedCustomerEmail({
        db: matching as never,
        customerId: 'c-1',
        authEmail: 'Neu@Example.com',
      })
    ).resolves.toBe(true)
    expect(matching.rpc).toHaveBeenCalledWith('confirm_customer_email_change', {
      p_customer_id: 'c-1',
      p_email: 'neu@example.com',
    })

    const waiting = createChangeDb({
      request: {
        id: 'req-2',
        customer_id: 'c-1',
        requested_email: 'neu@example.com',
        source: 'admin',
        status: 'awaiting_customer_confirmation',
        requested_by: 'admin-1',
        created_at: '2026-08-26T00:00:00.000Z',
        updated_at: '2026-08-26T00:00:00.000Z',
      },
    })

    await expect(
      reconcileConfirmedCustomerEmail({
        db: waiting as never,
        customerId: 'c-1',
        authEmail: 'neu@example.com',
      })
    ).resolves.toBe(false)
    expect(waiting.rpc).not.toHaveBeenCalled()
  })
})
