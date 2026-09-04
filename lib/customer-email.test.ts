import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CustomerEmailError,
  assertCustomerEmailAvailable,
  customerEmailsEqual,
  hasCustomerEmailChanged,
  normalizeCustomerEmail,
} from '@/lib/customer-email'

describe('normalizeCustomerEmail', () => {
  it('trimmt und normalisiert Groß- und Kleinschreibung', () => {
    expect(normalizeCustomerEmail('  Anna.Muster@Example.DE ')).toBe('anna.muster@example.de')
  })

  it.each([undefined, null, '', '   ', 'nicht-eine-email', 'kunde@example', 42])(
    'lehnt ungültige E-Mail-Adressen ab: %s',
    (value) => {
      expect(() => normalizeCustomerEmail(value)).toThrow(CustomerEmailError)
    }
  )
})

type QueryResult = { data: Array<Record<string, unknown>> | null; error: { message: string } | null }

function createAvailabilityDb(results: {
  customers?: QueryResult
  users?: QueryResult
  pending?: QueryResult
}) {
  return {
    from: vi.fn((table: string) => {
      const result =
        table === 'contacts'
          ? results.customers || { data: [], error: null }
          : table === 'users'
            ? results.users || { data: [], error: null }
            : results.pending || { data: [], error: null }

      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        ilike: vi.fn(async () => result),
      }
      return chain
    }),
  }
}

describe('customerEmailsEqual', () => {
  it('erkennt gleiche Adressen trotz unterschiedlicher Schreibweise', () => {
    expect(customerEmailsEqual('Anna.Muster@Example.DE', 'anna.muster@example.de')).toBe(true)
    expect(customerEmailsEqual('kunde@example.com', '  kunde@example.com ')).toBe(true)
  })

  it('erkennt unterschiedliche Adressen', () => {
    expect(customerEmailsEqual('a@example.com', 'b@example.com')).toBe(false)
  })

  it('behandelt leere gespeicherte Adresse', () => {
    expect(customerEmailsEqual('', '')).toBe(true)
    expect(customerEmailsEqual(null, null)).toBe(true)
    expect(customerEmailsEqual('', 'kunde@example.com')).toBe(false)
  })

  it('fällt bei ungültiger DB-E-Mail auf String-Vergleich zurück', () => {
    expect(customerEmailsEqual('keine-email', 'keine-email')).toBe(true)
    expect(customerEmailsEqual('keine-email', 'andere@example.com')).toBe(false)
  })
})

describe('hasCustomerEmailChanged', () => {
  it('liefert false bei reiner Schreibweisen-Änderung', () => {
    expect(hasCustomerEmailChanged('Name@Domain.de', 'name@domain.de')).toBe(false)
  })

  it('liefert true bei echter E-Mail-Änderung', () => {
    expect(hasCustomerEmailChanged('alt@example.com', 'neu@example.com')).toBe(true)
  })

  it('liefert false bei leerer Anfrage oder ungültiger neuer Adresse', () => {
    expect(hasCustomerEmailChanged('alt@example.com', '')).toBe(false)
    expect(hasCustomerEmailChanged('alt@example.com', 'ungueltig')).toBe(false)
  })
})

describe('assertCustomerEmailAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('erlaubt freie Adressen', async () => {
    await expect(
      assertCustomerEmailAvailable({
        db: createAvailabilityDb({}) as never,
        email: 'frei@example.com',
        customerId: 'c-1',
      })
    ).resolves.toBeUndefined()
  })

  it('erlaubt die eigene Kundenadresse', async () => {
    await expect(
      assertCustomerEmailAvailable({
        db: createAvailabilityDb({
          customers: { data: [{ id: 'c-1' }], error: null },
        }) as never,
        email: 'kunde@example.com',
        customerId: 'c-1',
      })
    ).resolves.toBeUndefined()
  })

  it('blockiert doppelte Kundenadressen case-insensitiv', async () => {
    await expect(
      assertCustomerEmailAvailable({
        db: createAvailabilityDb({
          customers: { data: [{ id: 'c-2' }], error: null },
        }) as never,
        email: 'Andere@Example.com',
        customerId: 'c-1',
      })
    ).rejects.toThrow(/Kunde mit dieser E-Mail/)
  })

  it('blockiert Adressen, die bereits als Login verwendet werden', async () => {
    await expect(
      assertCustomerEmailAvailable({
        db: createAvailabilityDb({
          users: { data: [{ id: 'u-2' }], error: null },
        }) as never,
        email: 'login@example.com',
        authUserId: 'u-1',
      })
    ).rejects.toThrow(/Portal-Konto/)
  })

  it('blockiert Adressen mit ausstehender Änderung bei anderem Kunden', async () => {
    await expect(
      assertCustomerEmailAvailable({
        db: createAvailabilityDb({
          pending: { data: [{ customer_id: 'c-9' }], error: null },
        }) as never,
        email: 'pending@example.com',
        customerId: 'c-1',
      })
    ).rejects.toThrow(/ausstehende Änderung/)
  })
})
