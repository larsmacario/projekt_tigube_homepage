import type { ContactType } from '@/lib/types'

export const LEAD_CONTACT_TYPES: readonly ContactType[] = ['lead', 'lost', 'waitlist']

export function isLeadContactType(contactType: string | null | undefined): boolean {
  if (!contactType) return false
  return (LEAD_CONTACT_TYPES as readonly string[]).includes(contactType)
}

export function computeMergedLeadFields(
  targetLead: Record<string, any>,
  sourceLead: Record<string, any>
): Record<string, any> {
  const updates: Record<string, any> = {}

  const fieldsToMerge = [
    'vorname',
    'nachname',
    'email',
    'telefonnummer',
    'telefon_2',
    'service',
    'pet',
    'kundennummer',
    'notfall_kontakt_name',
    'notfallnummer',
    'futtermenge',
    'medikamente',
    'besonderheiten',
    'intervall_impfung',
    'intervall_entwurmung',
    'anzahl_tiere',
    'tiernamen',
    'alter_tier',
    'intakt_kastriert',
    'urlaub_von',
    'urlaub_bis',
    'konkreter_urlaub',
    'ip_address',
    'user_agent',
    'timestamp',
    'assigned_to',
    'user_id',
  ]

  for (const field of fieldsToMerge) {
    const targetVal = targetLead[field]
    const sourceVal = sourceLead[field]

    if (
      (targetVal === null || targetVal === '' || targetVal === undefined) &&
      sourceVal !== null &&
      sourceVal !== '' &&
      sourceVal !== undefined
    ) {
      updates[field] = sourceVal
    }
  }

  // Determine merged contact_type & status
  const targetType = targetLead.contact_type
  const sourceType = sourceLead.contact_type

  if (targetType === 'lost' && sourceType === 'lead') {
    updates.contact_type = 'lead'
    updates.status = sourceLead.status || targetLead.status || 'new'
  } else if (targetType === 'lost' && sourceType === 'waitlist') {
    updates.contact_type = 'waitlist'
    updates.status = sourceLead.status || targetLead.status || 'new'
  } else if (targetType === 'waitlist' && sourceType === 'lead') {
    updates.contact_type = 'lead'
    updates.status = sourceLead.status || targetLead.status || 'new'
  } else if (!targetLead.status && sourceLead.status) {
    updates.status = sourceLead.status
  }

  // Telefonnummern-Logik
  if (
    targetLead.telefonnummer &&
    sourceLead.telefonnummer &&
    targetLead.telefonnummer.trim() !== sourceLead.telefonnummer.trim() &&
    (!targetLead.telefon_2 || targetLead.telefon_2.trim() === '')
  ) {
    updates.telefon_2 = sourceLead.telefonnummer
  }

  // Nachricht verketten
  if (sourceLead.message && sourceLead.message.trim() !== '') {
    if (targetLead.message && targetLead.message.trim() !== '') {
      if (targetLead.message.trim() !== sourceLead.message.trim()) {
        const dateStr = sourceLead.created_at
          ? new Date(sourceLead.created_at).toLocaleDateString('de-DE')
          : ''
        updates.message = `${targetLead.message}\n\n--- Zusammengeführt aus Lead${dateStr ? ` vom ${dateStr}` : ''}: ---\n${sourceLead.message}`
      }
    } else {
      updates.message = sourceLead.message
    }
  }

  // Verfügbarkeit verketten
  if (sourceLead.availability && sourceLead.availability.trim() !== '') {
    if (targetLead.availability && targetLead.availability.trim() !== '') {
      if (targetLead.availability.trim() !== sourceLead.availability.trim()) {
        updates.availability = `${targetLead.availability}\n\n--- Zusammengeführt: ---\n${sourceLead.availability}`
      }
    } else {
      updates.availability = sourceLead.availability
    }
  }

  // Datenschutz (OR)
  if (sourceLead.datenschutz !== undefined || targetLead.datenschutz !== undefined) {
    updates.datenschutz = Boolean(targetLead.datenschutz || sourceLead.datenschutz)
  }

  // Schulferien BW
  if (sourceLead.schulferien_bw !== null && sourceLead.schulferien_bw !== undefined) {
    if (targetLead.schulferien_bw === null || targetLead.schulferien_bw === undefined) {
      updates.schulferien_bw = sourceLead.schulferien_bw
    } else {
      updates.schulferien_bw = Boolean(targetLead.schulferien_bw || sourceLead.schulferien_bw)
    }
  }

  // Onboarding completed
  if (sourceLead.onboarding_completed !== undefined || targetLead.onboarding_completed !== undefined) {
    updates.onboarding_completed = Boolean(targetLead.onboarding_completed || sourceLead.onboarding_completed)
  }

  // Newsletter unsubscribed (früheres Datum)
  if (sourceLead.newsletter_unsubscribed_at) {
    if (!targetLead.newsletter_unsubscribed_at) {
      updates.newsletter_unsubscribed_at = sourceLead.newsletter_unsubscribed_at
    } else {
      const targetDate = new Date(targetLead.newsletter_unsubscribed_at)
      const sourceDate = new Date(sourceLead.newsletter_unsubscribed_at)
      if (sourceDate < targetDate) {
        updates.newsletter_unsubscribed_at = sourceLead.newsletter_unsubscribed_at
      }
    }
  }

  return updates
}

export function buildMergeSystemNote(sourceLead: Record<string, any>, adminEmail: string): string {
  const sourceName = [sourceLead.vorname, sourceLead.nachname].filter(Boolean).join(' ') || 'Unbekannt'
  const sourceEmail = sourceLead.email || 'Keine E-Mail'
  const createdDateStr = sourceLead.created_at
    ? new Date(sourceLead.created_at).toLocaleString('de-DE')
    : 'Unbekannt'

  return `System-Notiz: Lead "${sourceName}" (${sourceEmail}) wurde in diesen Lead zusammengeführt.
Original-Erstellungsdatum: ${createdDateStr}
Ausgeführt von: ${adminEmail}`
}
