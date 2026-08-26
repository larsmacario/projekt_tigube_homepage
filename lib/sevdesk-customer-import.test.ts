import { describe, expect, it } from 'vitest'

import {
  buildSevdeskImportCreatePayload,
  buildSevdeskImportUpdatePayload,
  resolveSevdeskImportMatch,
  type SevdeskImportMatchRecord,
} from '@/lib/sevdesk-customer-import'

const mapped = {
  nachname: 'Muster',
  vorname: 'Anna',
  email: 'anna@example.com',
  telefonnummer: '+49123456789',
  kundennummer: 'K-100',
  strasse: 'Hauptstraße',
  hausnummer: '12',
  plz: '70173',
  ort: 'Stuttgart',
}

const customerA: SevdeskImportMatchRecord = {
  id: 'customer-a',
  user_id: 'user-1',
  kundennummer: 'K-100',
  sevdesk_contact_id: 'sevdesk-99',
}

const customerB: SevdeskImportMatchRecord = {
  id: 'customer-b',
  user_id: null,
  kundennummer: 'K-200',
  sevdesk_contact_id: 'sevdesk-200',
}

describe('resolveSevdeskImportMatch', () => {
  it('bevorzugt einen eindeutigen Treffer über SevDesk, Nummer oder E-Mail', () => {
    expect(
      resolveSevdeskImportMatch({
        bySevdesk: customerA,
        byNumber: customerA,
        byEmail: customerA,
      })
    ).toEqual({ action: 'update', existing: customerA })

    expect(
      resolveSevdeskImportMatch({
        bySevdesk: null,
        byNumber: null,
        byEmail: customerA,
      })
    ).toEqual({ action: 'update', existing: customerA })
  })

  it('legt neue Kunden an, wenn kein Treffer existiert', () => {
    expect(
      resolveSevdeskImportMatch({
        bySevdesk: null,
        byNumber: null,
        byEmail: null,
      })
    ).toEqual({ action: 'create' })
  })

  it('meldet Konflikte bei widersprüchlichen Schlüsseln', () => {
    const result = resolveSevdeskImportMatch({
      bySevdesk: customerA,
      byNumber: customerB,
      byEmail: null,
    })

    expect(result.action).toBe('conflict')
    if (result.action === 'conflict') {
      expect(result.reason).toMatch(/unterschiedliche Portal-Kunden/)
    }
  })
})

describe('sevdesk-customer-import payloads', () => {
  it('legt neue Import-Kunden mit offenem Onboarding an', () => {
    const payload = buildSevdeskImportCreatePayload(mapped, 'sevdesk-99')

    expect(payload.onboarding_completed).toBe(false)
    expect(payload.status).toBe('pending')
    expect(payload.datenschutz).toBe(false)
    expect(payload.onboarding_email_status).toBeNull()
    expect(payload.onboarding_email_error).toBeNull()
    expect(payload.onboarding_email_sent_at).toBeNull()
    expect(payload.sevdesk_contact_id).toBe('sevdesk-99')
    expect(payload.kundennummer).toBe('K-100')
  })

  it('setzt beim Update ohne Portal-Login Onboarding und Vertrag zurück', () => {
    const payload = buildSevdeskImportUpdatePayload(mapped, 'sevdesk-99', { user_id: null })

    expect(payload.onboarding_completed).toBe(false)
    expect(payload.status).toBe('pending')
    expect(payload.contract_signed).toBe(false)
    expect(payload.onboarding_email_status).toBeNull()
    expect(payload.onboarding_email_error).toBeNull()
    expect(payload.onboarding_email_sent_at).toBeNull()
    expect(payload.datenschutz).toBe(false)
    expect(payload.email).toBe('anna@example.com')
  })

  it('lässt beim Update mit Portal-Login den Onboarding-Status und die bestätigte E-Mail unverändert', () => {
    const payload = buildSevdeskImportUpdatePayload(mapped, 'sevdesk-99', {
      user_id: 'user-1',
    })

    expect(payload.onboarding_completed).toBeUndefined()
    expect(payload.status).toBeUndefined()
    expect(payload.contract_signed).toBeUndefined()
    expect(payload.datenschutz).toBeUndefined()
    expect(payload.nachname).toBe('Muster')
    expect(payload.email).toBeUndefined()
  })
})
