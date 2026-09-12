import { describe, expect, it } from 'vitest'

import {
  ACCOUNT_DELETION_CONFIRMATION,
  computeCustomerRetentionUntil,
  INVOICE_RETENTION_YEARS,
  CONTRACT_RETENTION_YEARS,
  isRetentionActive,
} from '@/lib/customer-deletion'

describe('customer-deletion retention', () => {
  it('returns null when no invoice or contract exists', () => {
    const result = computeCustomerRetentionUntil({
      lastInvoiceSyncedAt: null,
      contractSignedAt: null,
    })

    expect(result.until).toBeNull()
    expect(result.reasons).toEqual({})
    expect(isRetentionActive(result.until)).toBe(false)
  })

  it('uses invoice retention of 10 years', () => {
    const result = computeCustomerRetentionUntil({
      lastInvoiceSyncedAt: '2020-06-15T10:00:00.000Z',
      contractSignedAt: null,
    })

    expect(result.until).toBe('2030-06-15')
    expect(result.reasons.invoices).toContain(String(INVOICE_RETENTION_YEARS))
  })

  it('uses contract retention of 6 years', () => {
    const result = computeCustomerRetentionUntil({
      lastInvoiceSyncedAt: null,
      contractSignedAt: '2021-03-01T08:00:00.000Z',
    })

    expect(result.until).toBe('2027-03-01')
    expect(result.reasons.contract).toContain(String(CONTRACT_RETENTION_YEARS))
  })

  it('picks the later retention date when both apply', () => {
    const result = computeCustomerRetentionUntil({
      lastInvoiceSyncedAt: '2020-01-01T00:00:00.000Z',
      contractSignedAt: '2023-01-01T00:00:00.000Z',
    })

    expect(result.until).toBe('2030-01-01')
    expect(result.reasons.invoices).toBeTruthy()
    expect(result.reasons.contract).toBeTruthy()
  })

  it('detects active and expired retention windows', () => {
    expect(isRetentionActive('2099-01-01', new Date('2026-01-01'))).toBe(true)
    expect(isRetentionActive('2020-01-01', new Date('2026-01-01'))).toBe(false)
  })

  it('requires the exact confirmation phrase', () => {
    expect(ACCOUNT_DELETION_CONFIRMATION).toBe('LÖSCHEN')
  })
})
