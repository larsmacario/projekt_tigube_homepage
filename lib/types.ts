// Database Types

export interface User {
  id: string
  email: string
  role: 'admin' | 'customer'
  created_at: string
  updated_at: string
}

/** Vereinheitlichte Kontaktzeile (Tabelle `contacts`): Leads, Kunden, verloren */
export type ContactType = 'lead' | 'customer' | 'lost'
/** Lead: new/contacted · Kunde: pending/active */
export type ContactStatus = 'new' | 'contacted' | 'pending' | 'active'

export interface Contact {
  id: string
  contact_type: ContactType
  status: ContactStatus | null
  nachname: string
  vorname: string | null
  email: string
  telefonnummer: string
  service: string
  pet: string | null
  message: string
  availability: string
  datenschutz: boolean
  anzahl_tiere: string | null
  tiernamen: string | null
  schulferien_bw: boolean | null
  konkreter_urlaub: string | null
  urlaub_von: string | null
  urlaub_bis: string | null
  intakt_kastriert: string | null
  alter_tier: string | null
  ip_address: string | null
  user_agent: string | null
  timestamp: string | null
  created_at: string
  updated_at: string
  properties: Record<string, unknown>
  assigned_to: string | null
  user_id: string | null
  kundennummer: string | null
  customer_group_id: string | null
  telefon_2: string | null
  notfall_kontakt_name: string | null
  notfallnummer: string | null
  futtermenge: string | null
  medikamente: string | null
  besonderheiten: string | null
  intervall_impfung: string | null
  intervall_entwurmung: string | null
  onboarding_completed: boolean
  email_internal_status: 'sent' | 'failed' | null
  email_internal_error: string | null
  email_confirmation_status: 'sent' | 'failed' | null
  email_confirmation_error: string | null
  newsletter_unsubscribed_at: string | null
  contract_signed?: boolean
  contract_signed_at?: string | null
}

/** Alias — Kunden sind `contacts` mit contact_type customer */
export type Customer = Contact

export interface Pet {
  id: string
  customer_id: string
  name: string
  tierart: string | null
  geschlecht: string | null
  letzte_impfung: string | null
  letzte_impfung_zusatz: string | null
  futtermenge: string | null
  medikamente: string | null
  besonderheiten: string | null
  intervall_impfung: string | null
  intervall_entwurmung: string | null
  letzte_stuhlprobe: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  customer_id: string
  pet_id: string | null
  document_type: 'vertrag' | 'impfpass' | 'wurmtest'
  file_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
  created_at: string
}

/** Onboarding-Link (customer_id zeigt auf `contacts`) */
export interface OnboardingToken {
  id: string
  customer_id: string | null
  token: string
  expires_at: string | null
  used: boolean
  used_at: string | null
  created_at: string
}

/** Notizen in `notes` für einen Kontakt (Lead oder Kunde) */
export interface ContactNote {
  id: string
  contact_id: string
  note: string
  created_by: string | {
    email: string
    role: string
  }
  created_at: string
  updated_at: string
}

/** @deprecated Umbenannt in ContactNote */
export type LeadNote = ContactNote

/** @deprecated Umbenannt in ContactNote */
export type CustomerNote = ContactNote

/** Lead-Zeilen aus der API (= Contact mit typ lead) — gleiche Form wie Contact */
export type ContactRequest = Contact

// Testimonial type definition
export interface Testimonial {
  id: string
  name: string
  pet: string | null
  rating: number
  text: string
  date: string
  is_published: boolean
  display_order: number
  created_at: string
  updated_at: string
}

// Google Reviews Types
export interface GoogleReview {
  author_name: string
  author_url?: string
  profile_photo_url?: string
  rating: number
  relative_time_description: string
  text: string
  time: number // Unix timestamp
}

export interface GooglePlaceDetails {
  place_id: string
  name: string
  rating: number
  user_ratings_total: number
  reviews: GoogleReview[]
  url: string // Google Maps URL
}

export interface GoogleReviewsResponse {
  success: boolean
  data?: GooglePlaceDetails
  error?: string
  cached?: boolean
  lastUpdated?: string
}

// Combined review type for display
export interface CombinedReview {
  id: string
  name: string
  pet: string | null
  rating: number
  text: string
  date: string
  source: 'local' | 'google'
  profilePhoto?: string
  authorUrl?: string
}

// Property System Types
export type PropertyFieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea'

export interface PropertyDefinition {
  id: string
  name: string
  label: string
  field_type: PropertyFieldType
  options: string[]
  required: boolean
  applies_to: ('lead' | 'customer')[]
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PropertyValue {
  id: string
  property_definition_id: string
  entity_type: 'lead' | 'customer'
  entity_id: string
  value_text: string | null
  value_number: number | null
  value_date: string | null
  value_boolean: boolean | null
  created_at: string
  updated_at: string
  // Joined data
  property_definition?: PropertyDefinition
}

// Booking Types
export type ServiceType = 'hundepension' | 'katzenbetreuung' | 'tagesbetreuung'
export type BookingStatus = 'pending' | 'approved' | 'rejected'

export interface BookingRequest {
  id: string
  customer_id: string
  pet_id: string
  service_type: ServiceType
  start_date: string
  end_date: string
  message: string | null
  status: BookingStatus
  admin_notes: string | null
  responded_at: string | null
  responded_by: string | null
  created_at: string
  updated_at: string
  // Joined data
  customer?: Customer
  pet?: Pet
  responded_by_user?: User
}

export interface CapacitySetting {
  id: string
  service_type: ServiceType | null // null = Gesamtkapazität
  default_capacity: number
  created_at: string
  updated_at: string
}

export interface CapacityOverride {
  id: string
  date: string
  service_type: ServiceType | null // null = Gesamtkapazität
  capacity: number
  reason: string | null
  created_at: string
}

// Calendar view types
export interface CalendarDay {
  date: Date
  bookings: BookingRequest[]
  capacity: {
    current: number
    max: number
    serviceType?: ServiceType | null
  }
}

// Newsletter Types
export type NewsletterCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'
export type NewsletterSendLogStatus = 'sent' | 'failed' | 'skipped_unsubscribed'

export interface NewsletterRecipientConfig {
  groups: string[]
  contactIds: string[]
}

export interface NewsletterCampaignStats {
  sent: number
  failed: number
  skipped: number
}

export interface NewsletterTopic {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NewsletterTemplate {
  id: string
  name: string
  subject_template: string
  preview_text: string | null
  html_body: string
  created_at: string
  updated_at: string
}

export interface NewsletterCampaign {
  id: string
  subject: string
  preview_text: string | null
  html_body: string
  plain_text: string | null
  from_address: string | null
  reply_to: string | null
  topic_id: string | null
  recipient_config: NewsletterRecipientConfig
  status: NewsletterCampaignStatus
  scheduled_at: string | null
  sent_at: string | null
  created_by: string | null
  stats: NewsletterCampaignStats
  created_at: string
  updated_at: string
  topic?: NewsletterTopic | null
}

export interface NewsletterSendLog {
  id: string
  campaign_id: string
  contact_id: string | null
  email: string
  status: NewsletterSendLogStatus
  error_message: string | null
  created_at: string
}

export type ContactEmailDirection = 'outbound' | 'inbound'
export type ContactEmailStatus = 'sent' | 'failed' | 'received'

export interface ContactEmail {
  id: string
  contact_id: string
  direction: ContactEmailDirection
  to_email: string
  from_email: string
  subject: string
  body_text: string
  status: ContactEmailStatus
  error_message: string | null
  message_id: string | null
  in_reply_to: string | null
  sent_by: string | {
    email: string
  } | null
  created_at: string
}

export interface CustomerGroup {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface GroupPrice {
  id: string
  group_id: string
  price_id: string
  price: number
  created_at: string
  updated_at: string
}

export interface CustomerPrice {
  id: string
  customer_id: string
  price_id: string
  price: number
  created_at: string
  updated_at: string
}
