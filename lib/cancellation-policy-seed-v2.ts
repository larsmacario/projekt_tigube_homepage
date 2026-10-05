import type { CancellationPolicyConfig } from '@/lib/cancellation-policy-config'

const SCHULFERIEN_CONTRACT_TITLE =
  'ACHTUNG - Für die Stornierung von Aufenthalten die in die gesetzlichen Schulferien des Landes BW fallen, gelten folgende Stornofristen:'

function tierDisplay(
  landing: { period: string; refund: string },
  contract: { period: string; refund: string },
  portal: { period: string; refund: string }
) {
  return { landing, contract, portal }
}

/** Wörtliche Übernahme der Live-Texte (CMS + AGB) als Policy v2. */
export const CANCELLATION_POLICY_V2_CONFIG: CancellationPolicyConfig = {
  title: 'Stornierungsbedingungen',
  displayTitles: {
    landing: {
      hundepension: 'Stornierungsbedingungen',
      katzenbetreuung: 'Stornierungsbedingungen',
    },
    portal: 'Stornierung',
    contract: 'Stornierung',
  },
  cutoffHour: 18,
  generalNotes: [
    'Absagen werden jeweils bis 18h berücksichtigt - auch dann, wenn sie an einem Sonn-/Feiertag oder in unserem Urlaub getätigt werden. Die Stornierung muss grundsätzlich in schriftlicher Form per Mail oder WhatsApp erfolgen.',
    'Bei frühzeitiger Abholung gibt es keine Rückerstattung der gebuchten Tage. Dies gilt auch, wenn ein Hund später als zum vereinbarten Datum in Betreuung gebracht wird.',
    'Tagesgäste müssen spätestens bis Mittwochabend ihren nicht benötigten Platz für die kommende Woche absagen, damit wir am Donnerstag unseren Springern den Platz anbieten können. Wird der Platz später abgesagt, gelten die o.g. Stornobedingungen.',
  ],
  ruleSets: [
    {
      id: 'standard',
      name: 'Standard',
      condition: { type: 'default' },
      priority: 0,
      serviceScopes: ['hundepension', 'tagesbetreuung'],
      sectionTitles: {
        landing: 'Stornierungsfristen außerhalb der Schulferien BW',
        contract: '',
        portal: '',
      },
      tiers: [
        {
          minDaysBefore: 15,
          maxDaysBefore: null,
          chargePercent: 0,
          label: '15 Tage und mehr vor Check-In',
          display: tierDisplay(
            { period: '15 Tage und mehr vor Check-In', refund: '100% Rückerstattung' },
            { period: '15 Tage und mehr vor Check-In:', refund: '100% Rückerstattung' },
            { period: '15 Tage und mehr vor Check-In:', refund: 'kostenlos' }
          ),
        },
        {
          minDaysBefore: 7,
          maxDaysBefore: 14,
          chargePercent: 50,
          label: '14 - 7 Tage vor Check-In',
          display: tierDisplay(
            { period: '14 - 7 Tage vor Check-In', refund: '50% Rückerstattung' },
            { period: '14 - 7 Tage vor Check-In:', refund: '50% Rückerstattung' },
            { period: '14 - 7 Tage vor Check-In:', refund: '50% der Buchungssumme' }
          ),
        },
        {
          minDaysBefore: 0,
          maxDaysBefore: 6,
          chargePercent: 100,
          label: '6 Tage und weniger vor Check-In',
          display: tierDisplay(
            { period: '6 Tage und weniger vor Check-In', refund: 'keine Rückerstattung' },
            { period: '6 Tage und weniger vor Check-In:', refund: 'keine Rückerstattung' },
            { period: '6 Tage und weniger vor Check-In:', refund: '100% der Buchungssumme' }
          ),
        },
      ],
      notes: [],
    },
    {
      id: 'school_holidays_bw',
      name: 'Schulferien Baden-Württemberg',
      condition: { type: 'school_holidays_bw' },
      priority: 10,
      serviceScopes: ['hundepension', 'tagesbetreuung'],
      sectionTitles: {
        landing: 'Stornierungsfristen in den Schulferien BW',
        contract: SCHULFERIEN_CONTRACT_TITLE,
        portal: SCHULFERIEN_CONTRACT_TITLE,
      },
      tiers: [
        {
          minDaysBefore: 56,
          maxDaysBefore: null,
          chargePercent: 0,
          label: '56 Tage und mehr vor Check-In',
          display: tierDisplay(
            { period: '56 Tage und mehr vor Check-In', refund: '100% Rückerstattung' },
            { period: '56 Tage und mehr vor Check-In:', refund: 'kostenlos' },
            { period: '56 Tage und mehr vor Check-In:', refund: 'kostenlos' }
          ),
        },
        {
          minDaysBefore: 21,
          maxDaysBefore: 55,
          chargePercent: 50,
          label: '55-21 Tage vor Check-In',
          display: tierDisplay(
            { period: '55-21 Tage vor Check-In', refund: '50% Rückerstattung' },
            { period: '55-21 Tage vor Check-In:', refund: '50% der Buchungssumme' },
            { period: '55-21 Tage vor Check-In:', refund: '50% der Buchungssumme' }
          ),
        },
        {
          minDaysBefore: 0,
          maxDaysBefore: 20,
          chargePercent: 100,
          label: '20 Tage und weniger vor Check-In',
          display: tierDisplay(
            { period: '20 Tage und weniger vor Check-In', refund: 'keine Rückerstattung' },
            { period: '20 Tage und weniger vor Check-In:', refund: '100% der Buchungssumme' },
            { period: '20 Tage und weniger vor Check-In:', refund: '100% der Buchungssumme' }
          ),
        },
      ],
      notes: [],
    },
    {
      id: 'standard_katzen',
      name: 'Katzen Standard',
      condition: { type: 'default' },
      priority: 0,
      serviceScopes: ['katzenbetreuung'],
      sectionTitles: {
        landing: '',
        contract: '',
        portal: '',
      },
      tiers: [
        {
          minDaysBefore: 15,
          maxDaysBefore: null,
          chargePercent: 0,
          label: '15 Tage und mehr vor Betreuungsbeginn',
          display: tierDisplay(
            { period: '15 Tage und mehr vor Betreuungsbeginn', refund: '100% Rückerstattung' },
            { period: '15 Tage und mehr vor Betreuungsbeginn:', refund: '100% Rückerstattung' },
            { period: '15 Tage und mehr vor Betreuungsbeginn:', refund: '100% Rückerstattung' }
          ),
        },
        {
          minDaysBefore: 7,
          maxDaysBefore: 14,
          chargePercent: 50,
          label: '14-7 Tage vor Betreuungsbeginn',
          display: tierDisplay(
            { period: '14-7 Tage vor Betreuungsbeginn', refund: '50% Rückerstattung' },
            { period: '14-7 Tage vor Betreuungsbeginn:', refund: '50% Rückerstattung' },
            { period: '14-7 Tage vor Betreuungsbeginn:', refund: '50% Rückerstattung' }
          ),
        },
        {
          minDaysBefore: 0,
          maxDaysBefore: 6,
          chargePercent: 100,
          label: '6 Tage und weniger vor Betreuungsbeginn',
          display: tierDisplay(
            { period: '6 Tage und weniger vor Betreuungsbeginn', refund: 'keine Rückerstattung' },
            { period: '6 Tage und weniger vor Betreuungsbeginn:', refund: 'keine Rückerstattung' },
            { period: '6 Tage und weniger vor Betreuungsbeginn:', refund: 'keine Rückerstattung' }
          ),
        },
      ],
      notes: [],
    },
  ],
}
