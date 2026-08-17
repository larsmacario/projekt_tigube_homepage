import { describe, it, expect } from 'vitest'
import {
  isLeadContactType,
  computeMergedLeadFields,
  buildMergeSystemNote,
} from './lead-merge'

describe('lead-merge', () => {
  describe('isLeadContactType', () => {
    it('accepts lead, lost, and waitlist', () => {
      expect(isLeadContactType('lead')).toBe(true)
      expect(isLeadContactType('lost')).toBe(true)
      expect(isLeadContactType('waitlist')).toBe(true)
    })

    it('rejects customer and invalid values', () => {
      expect(isLeadContactType('customer')).toBe(false)
      expect(isLeadContactType(null)).toBe(false)
      expect(isLeadContactType(undefined)).toBe(false)
      expect(isLeadContactType('other')).toBe(false)
    })
  })

  describe('computeMergedLeadFields', () => {
    it('merges empty target fields from source lead', () => {
      const target = {
        contact_type: 'lead',
        vorname: 'Iris',
        nachname: 'Fichert',
        email: 'itfchert@web.de',
        telefonnummer: '015205432644',
        telefon_2: null,
        service: null,
        pet: null,
        message: 'Hallo, Anfrage 1',
      }
      const source = {
        contact_type: 'lost',
        vorname: 'Iris',
        nachname: 'Fichert',
        email: 'itfchert@web.de',
        telefonnummer: '015205432644',
        telefon_2: '0711123456',
        service: 'tagesbetreuung',
        pet: 'Hund',
        message: 'Hallo, Anfrage 2',
        created_at: '2026-08-05T15:21:37Z',
      }

      const updates = computeMergedLeadFields(target, source)
      expect(updates.telefon_2).toBe('0711123456')
      expect(updates.service).toBe('tagesbetreuung')
      expect(updates.pet).toBe('Hund')
      expect(updates.message).toContain('Hallo, Anfrage 1')
      expect(updates.message).toContain('Hallo, Anfrage 2')
    })

    it('promotes lost target to lead when source is lead', () => {
      const target = {
        contact_type: 'lost',
        status: null,
        vorname: 'Iris',
      }
      const source = {
        contact_type: 'lead',
        status: 'new',
        vorname: 'Iris',
      }

      const updates = computeMergedLeadFields(target, source)
      expect(updates.contact_type).toBe('lead')
      expect(updates.status).toBe('new')
    })

    it('promotes lost target to waitlist when source is waitlist', () => {
      const target = {
        contact_type: 'lost',
        status: null,
      }
      const source = {
        contact_type: 'waitlist',
        status: 'new',
      }

      const updates = computeMergedLeadFields(target, source)
      expect(updates.contact_type).toBe('waitlist')
      expect(updates.status).toBe('new')
    })

    it('moves different phone number to telefon_2 when telefon_2 is empty', () => {
      const target = {
        contact_type: 'lost',
        telefonnummer: '015205432644',
        telefon_2: '',
      }
      const source = {
        contact_type: 'lead',
        telefonnummer: '01701234567',
      }

      const updates = computeMergedLeadFields(target, source)
      expect(updates.telefon_2).toBe('01701234567')
    })

    it('merges booleans using OR logic', () => {
      const target = {
        contact_type: 'lead',
        datenschutz: false,
        schulferien_bw: false,
      }
      const source = {
        contact_type: 'lead',
        datenschutz: true,
        schulferien_bw: true,
      }

      const updates = computeMergedLeadFields(target, source)
      expect(updates.datenschutz).toBe(true)
      expect(updates.schulferien_bw).toBe(true)
    })
  })

  describe('buildMergeSystemNote', () => {
    it('creates formatted merge note', () => {
      const source = {
        vorname: 'Iris',
        nachname: 'Fichert',
        email: 'itfchert@web.de',
        created_at: '2026-08-05T15:21:37.000Z',
      }
      const note = buildMergeSystemNote(source, 'admin@tigube.de')
      expect(note).toContain('Iris Fichert')
      expect(note).toContain('itfchert@web.de')
      expect(note).toContain('admin@tigube.de')
    })
  })
})
