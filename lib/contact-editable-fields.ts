export const CONTACT_BLOCKED_FIELDS = [
  'id',
  'datenschutz',
  'onboarding_completed',
  'contract_signed',
  'contract_signed_at',
  'contract_email_status',
  'contract_email_error',
  'contract_email_sent_at',
  'created_at',
  'updated_at',
  'timestamp',
  'email_internal_status',
  'email_internal_error',
  'email_confirmation_status',
  'email_confirmation_error',
  'ip_address',
  'user_agent',
  'user_id',
  'assigned_to',
  'properties',
  'newsletter_unsubscribed_at',
  'contact_type',
] as const

export const LEAD_EDITABLE_FIELDS = [
  'vorname',
  'nachname',
  'email',
  'telefonnummer',
  'telefon_2',
  'service',
  'pet',
  'message',
  'availability',
  'anzahl_tiere',
  'tiernamen',
  'schulferien_bw',
  'konkreter_urlaub',
  'urlaub_von',
  'urlaub_bis',
  'intakt_kastriert',
  'alter_tier',
  'notfall_kontakt_name',
  'notfallnummer',
  'status',
  'contact_type',
] as const

export const CUSTOMER_EDITABLE_FIELDS = [
  'vorname',
  'nachname',
  'email',
  'telefonnummer',
  'telefon_2',
  'strasse',
  'hausnummer',
  'plz',
  'ort',
  'kundennummer',
  'customer_group_id',
  'notfall_kontakt_name',
  'notfallnummer',
  'futtermenge',
  'medikamente',
  'besonderheiten',
  'intervall_impfung',
  'intervall_entwurmung',
] as const

/** Felder, die Kunden im Portal unter /api/portal/profile setzen dürfen */
export const PORTAL_PROFILE_EDITABLE_FIELDS = [
  'vorname',
  'nachname',
  'email',
  'telefonnummer',
  'telefon_2',
  'strasse',
  'hausnummer',
  'plz',
  'ort',
  'notfall_kontakt_name',
  'notfallnummer',
  'datenschutz',
] as const

export const PORTAL_ONBOARDING_STATUS_FIELDS = [
  'onboarding_completed',
  'contract_signed',
  'contract_signed_at',
] as const

export const PET_EDITABLE_FIELDS = [
  'name',
  'tierart',
  'rasse',
  'farbe',
  'wiedererkennungsmerkmal',
  'geschlecht',
  'letzte_impfung',
  'letzte_impfung_zusatz',
  'futtermenge',
  'medikamente',
  'besonderheiten',
  'intervall_impfung',
  'intervall_entwurmung',
  'letzte_stuhlprobe',
  'naechste_stuhlprobe',
] as const

export function pickAllowedFields(
  updates: Record<string, unknown>,
  allowed: readonly string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      result[key] = updates[key]
    }
  }
  return result
}
