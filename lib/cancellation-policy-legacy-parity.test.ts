import { describe, expect, it } from 'vitest'

import {
  getPolicyDisplayTitle,
  policyToCancellationSections,
} from '@/lib/cancellation-policy-display'
import { CANCELLATION_POLICY_V2_CONFIG } from '@/lib/cancellation-policy-seed-v2'
import { resolveBetreuungsvertragLegal } from '@/lib/betreuungsvertrag'

/** Wörtliche CMS-Texte aus der Live-Datenbank (Stand Planung). */
const LEGACY_HUNDEPENSION_SECTIONS = [
  {
    title: 'Stornierungsfristen außerhalb der Schulferien BW',
    policy: [
      { period: '15 Tage und mehr vor Check-In', refund: '100% Rückerstattung' },
      { period: '14 - 7 Tage vor Check-In', refund: '50% Rückerstattung' },
      { period: '6 Tage und weniger vor Check-In', refund: 'keine Rückerstattung' },
    ],
  },
  {
    title: 'Stornierungsfristen in den Schulferien BW',
    policy: [
      { period: '56 Tage und mehr vor Check-In', refund: '100% Rückerstattung' },
      { period: '55-21 Tage vor Check-In', refund: '50% Rückerstattung' },
      { period: '20 Tage und weniger vor Check-In', refund: 'keine Rückerstattung' },
    ],
  },
]

const LEGACY_KATZEN_SECTIONS = [
  {
    title: '',
    policy: [
      { period: '15 Tage und mehr vor Betreuungsbeginn', refund: '100% Rückerstattung' },
      { period: '14-7 Tage vor Betreuungsbeginn', refund: '50% Rückerstattung' },
      { period: '6 Tage und weniger vor Betreuungsbeginn', refund: 'keine Rückerstattung' },
    ],
  },
]

const LEGACY_PORTAL_SECTIONS = [
  {
    title: '',
    policy: [
      { period: '15 Tage und mehr vor Check-In:', refund: 'kostenlos' },
      { period: '14 - 7 Tage vor Check-In:', refund: '50% der Buchungssumme' },
      { period: '6 Tage und weniger vor Check-In:', refund: '100% der Buchungssumme' },
    ],
  },
  {
    title:
      'ACHTUNG - Für die Stornierung von Aufenthalten die in die gesetzlichen Schulferien des Landes BW fallen, gelten folgende Stornofristen:',
    policy: [
      { period: '56 Tage und mehr vor Check-In:', refund: 'kostenlos' },
      { period: '55-21 Tage vor Check-In:', refund: '50% der Buchungssumme' },
      { period: '20 Tage und weniger vor Check-In:', refund: '100% der Buchungssumme' },
    ],
  },
]

describe('cancellation-policy legacy parity', () => {
  it('übernimmt Landingpage Hundepension wörtlich', () => {
    const sections = policyToCancellationSections(
      CANCELLATION_POLICY_V2_CONFIG,
      'hundepension',
      'landing'
    )
    expect(sections).toEqual(
      LEGACY_HUNDEPENSION_SECTIONS.map((section) => ({ ...section, notes: [] }))
    )
  })

  it('übernimmt Landingpage Katzen wörtlich', () => {
    const sections = policyToCancellationSections(
      CANCELLATION_POLICY_V2_CONFIG,
      'katzenbetreuung',
      'landing'
    )
    expect(sections).toEqual(
      LEGACY_KATZEN_SECTIONS.map((section) => ({ ...section, notes: [] }))
    )
    expect(getPolicyDisplayTitle(CANCELLATION_POLICY_V2_CONFIG, 'katzenbetreuung', 'landing')).toBe(
      'Stornierungsbedingungen'
    )
  })

  it('übernimmt Portal-Storno inkl. Schulferien-Block wörtlich', () => {
    const sections = policyToCancellationSections(
      CANCELLATION_POLICY_V2_CONFIG,
      'hundepension',
      'portal'
    )
    expect(sections).toEqual(
      LEGACY_PORTAL_SECTIONS.map((section) => ({ ...section, notes: [] }))
    )
    expect(CANCELLATION_POLICY_V2_CONFIG.generalNotes).toHaveLength(3)
  })

  it('Vertrag enthält AGB-Standardstaffeln und neue Hinweise', () => {
    const legal = resolveBetreuungsvertragLegal(null, {
      config: CANCELLATION_POLICY_V2_CONFIG,
      version: 2,
    })
    expect(legal.content).toContain('100% Rückerstattung')
    expect(legal.content).toContain('Schulferien des Landes BW')
    expect(legal.content).toContain('Tagesgäste müssen spätestens bis Mittwochabend')
    expect(legal.content).toContain('Stand der Stornierungsbedingungen: Version 2')
  })
})
