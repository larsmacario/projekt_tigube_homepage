import { describe, expect, it } from 'vitest'

import { mapSevdeskContactToPortalFields } from '@/lib/sevdesk-contact-mapper'
import type { SevdeskContactDetail } from '@/lib/types'

describe('sevdesk-contact-mapper', () => {
  it('mappt SevDesk-Stammdaten auf Portal-Felder', () => {
    const detail: SevdeskContactDetail = {
      id: '99',
      name: null,
      surename: 'Anna',
      familyname: 'Muster',
      customerNumber: 'K-100',
      category: { id: '1', objectName: 'Category' },
      tags: [{ id: '1', name: 'aktiv' }],
      communicationWays: [
        { type: 'EMAIL', value: 'anna@example.com' },
        { type: 'PHONE', value: '+49123456789' },
      ],
      addresses: [
        {
          street: 'Hauptstraße 12',
          zip: '70173',
          city: 'Stuttgart',
          category: 'delivery',
        },
      ],
    }

    const mapped = mapSevdeskContactToPortalFields(detail)

    expect(mapped.kundennummer).toBe('K-100')
    expect(mapped.vorname).toBe('Anna')
    expect(mapped.nachname).toBe('Muster')
    expect(mapped.email).toBe('anna@example.com')
    expect(mapped.strasse).toBe('Hauptstraße')
    expect(mapped.hausnummer).toBe('12')
    expect(mapped.plz).toBe('70173')
    expect(mapped.ort).toBe('Stuttgart')
  })

  it('lehnt Kontakte ohne Kundennummer ab', () => {
    expect(() =>
      mapSevdeskContactToPortalFields({
        id: '1',
        name: 'Test',
        surename: null,
        customerNumber: null,
        category: null,
        communicationWays: [{ type: 'EMAIL', value: 'test@example.com' }],
        addresses: [],
      })
    ).toThrow(/Kundennummer/)
  })

  it('normalisiert importierte E-Mail-Adressen', () => {
    const mapped = mapSevdeskContactToPortalFields({
      id: '2',
      name: 'Test',
      surename: null,
      customerNumber: 'K-200',
      category: null,
      communicationWays: [{ type: 'EMAIL', value: '  TEST@EXAMPLE.DE ' }],
      addresses: [],
    })

    expect(mapped.email).toBe('test@example.de')
  })
})
