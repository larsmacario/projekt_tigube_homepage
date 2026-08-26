import { describe, expect, it } from 'vitest'

import {
  assertCustomerMergeAllowed,
  computeMergedCustomerFields,
  scoreCustomerMergePriority,
  suggestCustomerMergePair,
  type CustomerMergeSummary,
} from '@/lib/customer-merge'
import { CustomerMergeError } from '@/lib/customer-merge'

const portalCustomer: CustomerMergeSummary = {
  id: 'portal-1',
  vorname: 'Anna',
  nachname: 'Muster',
  email: 'anna@example.com',
  kundennummer: null,
  sevdesk_contact_id: null,
  user_id: 'user-1',
  status: 'active',
  onboarding_completed: true,
  created_at: '2026-07-29T00:00:00.000Z',
  petCount: 2,
  documentCount: 5,
  bookingCount: 1,
}

const importCustomer: CustomerMergeSummary = {
  id: 'import-1',
  vorname: 'Anna',
  nachname: 'Muster',
  email: 'anna@example.com',
  kundennummer: 'K-100',
  sevdesk_contact_id: 'sevdesk-99',
  user_id: null,
  status: 'pending',
  onboarding_completed: false,
  created_at: '2026-08-10T00:00:00.000Z',
  petCount: 0,
  documentCount: 0,
  bookingCount: 0,
}

describe('customer merge helpers', () => {
  it('schlägt Portal-Kunden als Ziel vor', () => {
    expect(suggestCustomerMergePair([importCustomer, portalCustomer])).toEqual({
      targetId: 'portal-1',
      sourceId: 'import-1',
    })
    expect(scoreCustomerMergePriority(portalCustomer)).toBeGreaterThan(
      scoreCustomerMergePriority(importCustomer)
    )
  })

  it('füllt fehlende SevDesk-Felder auf dem Ziel auf', () => {
    const updates = computeMergedCustomerFields(
      {
        id: 'portal-1',
        vorname: 'Anna',
        nachname: 'Muster',
        email: 'anna@example.com',
        user_id: 'user-1',
        onboarding_completed: true,
      },
      {
        id: 'import-1',
        kundennummer: 'K-100',
        sevdesk_contact_id: 'sevdesk-99',
        sevdesk_synced_at: '2026-08-10T00:00:00.000Z',
      }
    )

    expect(updates.kundennummer).toBe('K-100')
    expect(updates.sevdesk_contact_id).toBe('sevdesk-99')
    expect(updates.user_id).toBeUndefined()
  })

  it('blockiert das Zusammenführen unterschiedlicher Portal-Konten', () => {
    expect(() =>
      assertCustomerMergeAllowed(
        { id: 'a', contact_type: 'customer', email: 'anna@example.com', user_id: 'user-1' },
        { id: 'b', contact_type: 'customer', email: 'anna@example.com', user_id: 'user-2' }
      )
    ).toThrow(CustomerMergeError)
  })

  it('erlaubt Merge bei gleicher E-Mail und nur einem Portal-Login', () => {
    expect(() =>
      assertCustomerMergeAllowed(
        { id: 'a', contact_type: 'customer', email: 'anna@example.com', user_id: 'user-1' },
        { id: 'b', contact_type: 'customer', email: 'anna@example.com', user_id: null }
      )
    ).not.toThrow()
  })
})
