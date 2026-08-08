// Database Types

export interface User {
  id: string
  email: string
  role: 'admin' | 'customer'
  vorname?: string | null
  nachname?: string | null
  created_at: string
  updated_at: string
}


/** Vereinheitlichte Kontaktzeile (Tabelle `contacts`): Leads, Kunden, verloren, Warteliste */
export type ContactType = 'lead' | 'customer' | 'lost' | 'waitlist'
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
  strasse: string | null
  hausnummer: string | null
  plz: string | null
  ort: string | null
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
  contract_email_status?: 'sent' | 'failed' | null
  contract_email_error?: string | null
  contract_email_sent_at?: string | null
  sevdesk_contact_id?: string | null
  sevdesk_synced_at?: string | null
  sevdesk_sync_error?: string | null
}

/** Alias — Kunden sind `contacts` mit contact_type customer */
export type Customer = Contact

export interface Pet {
  id: string
  customer_id: string
  name: string
  tierart: string | null
  rasse: string | null
  farbe: string | null
  /** z. B. weiße Pfote links – hilft bei Mehrhundehaltung */
  wiedererkennungsmerkmal: string | null
  geschlecht: string | null
  /** Anzahl Fotos in der Galerie (aggregiert aus pet_photos) */
  photo_count?: number
  /** Signierte URL des ersten Galerie-Fotos (Listen-Ansicht) */
  primary_photo_url?: string | null
  /** Kombiimpfung (Hund): Parvo, Lepto, Hepatitis, Staupe */
  letzte_impfung: string | null
  /** Zwingerhusten (Hund), jährlich */
  letzte_impfung_zusatz: string | null
  futtermenge: string | null
  medikamente: string | null
  besonderheiten: string | null
  /** Strukturierter Futter-/Medikamentenplan (JSONB) */
  care_plan: import('@/lib/pet-care-plan').PetCarePlan | null
  /** Kombi-Intervall: jährlich | alle_2_jahre */
  intervall_impfung: string | null
  intervall_entwurmung: string | null
  letzte_stuhlprobe: string | null
  naechste_stuhlprobe: string | null
  created_at: string
  updated_at: string
}

export interface PetCarePlanChange {
  id: string
  pet_id: string
  customer_id: string
  changed_at: string
  changed_by: string | null
  summary: string
  seen_at: string | null
  pet?: Pick<Pet, 'id' | 'name'> | null
  customer?: Pick<Contact, 'id' | 'vorname' | 'nachname' | 'email'> | null
}

export interface PetPhoto {
  id: string
  pet_id: string
  customer_id: string
  file_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  sort_order: number
  created_at: string
  updated_at: string
  signedUrl?: string
}

export interface PetVaccinationReminderLog {
  id: string
  pet_id: string
  vaccination_type: 'kombi' | 'zwingerhusten'
  due_date: string
  days_before: 28 | 14
  sent_at: string
  recipient_email: string
}

export type {
  UpcomingVaccinationRow,
  UpcomingVaccinationSummary,
  UpcomingVaccinationStatus,
} from '@/lib/pet-vaccination'

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

export type TableViewEntityType = 'lead' | 'customer'
export type TableViewScope = 'personal' | 'global'

export interface TableViewColumnConfig {
  id: string
  visible: boolean
  order: number
  width?: number
}

export interface TableViewConfig {
  columns: TableViewColumnConfig[]
}

export interface AdminTableView {
  id: string
  name: string
  entity_type: TableViewEntityType
  scope: TableViewScope
  user_id: string | null
  created_by: string
  config: TableViewConfig
  is_default: boolean
  created_at: string
  updated_at: string
}

// Booking Types
export type ServiceType = 'hundepension' | 'katzenbetreuung' | 'tagesbetreuung'
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type CancellationFinancialStatus = 'none' | 'pending' | 'processed'
export type DayCareMode = 'once' | 'recurring'

export interface BookingRequest {
  id: string
  customer_id: string
  pet_id: string
  service_type: ServiceType
  start_date: string
  end_date: string | null
  day_care_mode: DayCareMode | null
  day_care_weekdays: number[] | null
  selected_dates: string[] | null
  message: string | null
  status: BookingStatus
  admin_notes: string | null
  responded_at: string | null
  responded_by: string | null
  request_group_id: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_charge_amount: number | null
  cancellation_refund_amount: number | null
  cancellation_policy_snapshot: Record<string, unknown> | null
  cancellation_rule_set_id: string | null
  cancellation_tier_label: string | null
  cancellation_financial_status: CancellationFinancialStatus
  cancelled_dates: string[]
  created_at: string
  updated_at: string
  request_group?: BookingRequestGroup | null
  // Joined data
  customer?: Customer
  pet?: Pet
  responded_by_user?: User
}

export interface BookingRequestGroup {
  id: string
  customer_id: string
  drop_off_time: string | null
  pick_up_time: string | null
  created_at: string
  sevdesk_invoice_id?: string | null
  sevdesk_invoice_number?: string | null
  sevdesk_invoice_synced_at?: string | null
  sevdesk_invoice_sync_status?: SevdeskInvoiceSyncStatus
  sevdesk_invoice_sync_error?: string | null
}

export type SevdeskInvoiceSyncStatus = 'none' | 'pending' | 'synced' | 'failed'

export type BookingLineItemSource = 'customer' | 'admin'

export interface AddonService {
  id: string
  title: string
  description: string | null
  amount: number
  sort_order: number
  is_active: boolean
  sevdesk_article_id?: string | null
  created_at: string
  updated_at: string
}

export interface BookingLineItem {
  id: string
  request_group_id: string
  booking_id: string | null
  price_id: string | null
  addon_service_id: string | null
  label: string
  description: string | null
  price_type: 'fixed' | 'percentage' | 'per_unit' | 'text'
  unit: string | null
  quantity: number
  unit_price: number | null
  line_total: number | null
  source: BookingLineItemSource
  created_by: string | null
  created_at: string
  updated_at: string
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

export type PriceUsage = 'base' | 'extra' | 'surcharge' | 'info'
export type PriceRuleMode = 'inherit' | 'custom' | 'not_applicable'
export type PriceScopeType = 'group' | 'customer' | 'pet'

export interface ServiceArea {
  id: string
  slug: string
  name: string
  description: string | null
  sort_order: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface PriceRule {
  id: string
  price_id: string
  scope_type: PriceScopeType
  scope_id: string
  rule_mode: PriceRuleMode
  price: number | null
  discount_type: PriceOverrideDiscountType | null
  discount_value: number | null
  created_at: string
  updated_at: string
}

export type PriceOverrideDiscountType = 'fixed' | 'percentage'

export interface GroupPrice {
  id: string
  group_id: string
  price_id: string
  price: number | null
  discount_type: PriceOverrideDiscountType | null
  discount_value: number | null
  created_at: string
  updated_at: string
}

export interface CustomerPrice {
  id: string
  customer_id: string
  price_id: string
  price: number | null
  discount_type: PriceOverrideDiscountType | null
  discount_value: number | null
  created_at: string
  updated_at: string
}

export interface SiteSettings {
  id: string
  waitlist_enabled: boolean
  updated_at: string | null
}

export interface WaitlistCmsContent {
  formTitle: string
  formHint: string
  formDescription: string
  successMessage: string
  emailSubject: string
  emailIntro: string
}

export interface SevdeskSettings {
  id: string
  is_connected: boolean
  key_preview: string | null
  last_tested_at: string | null
  last_test_ok: boolean | null
  last_test_error: string | null
  connected_by: string | null
  connected_at: string | null
  last_customer_import_at?: string | null
  last_customer_import_summary?: SevdeskCustomerImportSummary | null
  updated_at: string
}

export interface SevdeskCustomerImportSummary {
  created: number
  updated: number
  skipped: number
  failed: number
  skippedReasons?: Array<{ customerNumber: string | null; reason: string }>
  failures?: Array<{ customerNumber: string | null; reason: string }>
}

export interface SevdeskConnectionStatus {
  settings: SevdeskSettings | null
}

export interface SevdeskTag {
  id: string
  name: string
}

export interface SevdeskContact {
  id: string
  name: string | null
  surename: string | null
  familyname?: string | null
  customerNumber: string | null
  category: { id: string; objectName: string } | null
  tags?: SevdeskTag[]
}

export interface SevdeskContactDetail extends SevdeskContact {
  communicationWays: Array<{ type: string; value: string; key?: string | null }>
  addresses: Array<{
    street: string | null
    zip: string | null
    city: string | null
    category: string | null
  }>
}

export interface SevdeskInvoiceDraftResult {
  invoiceId: string
  invoiceNumber: string | null
}

export interface InvoiceSyncCandidate {
  requestGroupId: string
  customerId: string
  customerName: string
  kundennummer: string | null
  startDate: string
  endDate: string | null
  lineItemCount: number
  lineItemTotal: number
  sevdeskInvoiceSyncStatus: SevdeskInvoiceSyncStatus
  blockers: string[]
}

export interface SevdeskPart {
  id: string
  name: string | null
  partNumber: string | null
  price: number | null
  taxRate: number | null
}
