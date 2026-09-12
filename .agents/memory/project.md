# Projekt: Tierisch Gut Betreut

## Ziel
Website und Verwaltungsportal für einen Tierbetreuungsservice. Das CRM verwaltet Kontaktanfragen als Leads und konvertierte Kunden.

## Tech-Stack
- Next.js 15, React 19 und TypeScript
- Tailwind CSS, shadcn/ui und Lucide React
- Supabase für PostgreSQL, Authentifizierung, Storage und CMS
- Custom CMS über Supabase JSONB-Tabelle `cms_content` und Storage-Bucket `cms-assets`
- E-Mail-Versand über SMTP (nodemailer)

## Architektur
- App Router mit Client-Seiten im Admin-Bereich und Route Handlers unter `app/api`.
- Integrierte Admin-Oberfläche unter `/admin/cms` zur Inhaltsverwaltung aller statischen, Unter- und Rechtsseiten.
- Die Tabelle `contacts` enthält Leads und Kunden über `contact_type`; weitere CRM-Daten referenzieren diese ID.
- Admin-Tabellenlayouts (Spalten-Views) liegen in `admin_table_views` als JSON-Config, Scope `personal` oder `global`.
- Admin-Zugriffe werden in jeder API-Route über die Supabase-Rolle `admin` geprüft.
- Hunde-Impfdaten in `pets`: `letzte_impfung` (Kombi), `intervall_impfung`, `letzte_impfung_zusatz` (Zwingerhusten); Logik in `lib/pet-vaccination.ts`.
- Pflegeplan pro Tier: `pets.care_plan` (JSONB, Fütterung/Medikamente nach Tageszeit); Legacy-Felder `futtermenge`/`medikamente` werden beim Speichern synchronisiert. Änderungen in `pet_care_plan_changes`; Admin unter `/admin/care-plans`. Kernlogik `lib/pet-care-plan.ts`.
- Impf-Erinnerungen: täglicher Supabase-Cron ruft Next.js-Route `/api/cron/vaccination-reminders` auf; Versand-Log in `pet_vaccination_reminder_log`.
- Admin-Impfübersicht unter `/admin/impfungen` via `/api/admin/vaccinations/upcoming`.
- Kundenportal: Mehr-Tier-Buchungsanfragen unter `/portal/bookings/new` (4-Schritte-Wizard, Verfügbarkeit inkl. BW-Feiertage via Nager.Date, gruppierte `bookings`, `booking_request_groups` für Bring-/Holzeiten, auto-`booking_line_items` für Bring-/Hol-Zuschlag, Übernachtung und An-/Abreise Sa/So/Feiertag). CMS `pickupTimeDefaults` für Voreinstellung, `pickupTimesList` inline im Wizard (`PickupTimesReference`). Kostenschätzung Schritt 4 (`lib/booking-price-estimate.ts`: Grundpreis, Sonn-/Feiertag ohne Abholtag, applicable Auto-Extras, Bring-/Hol-Zuschlag, An-/Abreise-Pauschale, Übernachtung nach 20:00). Nach POST versendet `/api/portal/bookings` per SMTP intern und Bestätigung an Kunden (`lib/booking-request-email.ts`).
- Feste Tagesbetreuung: `day_care_interval_weeks` 1|2 (Startanker); Expansion/Kapazität in `lib/day-care-interval.ts` (12 Monate). Urlaubs-Teilstorno über `cancelled_dates` + `booking_cancellation_events`. Springerliste: `springer_registrations` / `springer_offers`, Portal `/portal/springer`, Admin-Tab unter Buchungen.
- Preis-Katalog: `prices.usage` (`base`/`extra`/`surcharge`/`info`) steuert Anzeige und Buchbarkeit; Overrides in `price_rules` für Gruppe, Kunde und Tier (Zustände geerbt/custom/nicht zutreffend). Zentraler Resolver `lib/price-resolver.ts`. Dynamische `service_areas`; Buchungsabläufe bleiben auf bestehende Betreuungsarten begrenzt.
- SevDesk (Kunden + Rechnungen): API-Key im Supabase Vault; `sevdesk_settings`, `sevdesk_sync_runs`; Client `lib/sevdesk.ts`. Kundenimport nur mit Tag `aktiv` (Kundennummer-Schlüssel); Portal-Kunden bei Onboarding-Abschluss nach SevDesk. Rechnungsentwürfe manuell pro `booking_request_groups` (Admin Tab Abrechnung); `prices.sevdesk_article_id` und `addon_services.sevdesk_article_id`; Verknüpfung `contacts.sevdesk_contact_id`. Storno-Rechnungen separat, nicht im regulären Sync.
- Betreuungsvertrag: verbindlicher Vertragstext aus CMS-Key `agb` (öffentlich `/agb`, Fallback `lib/cms/legal-defaults.ts`); Onboarding Schritt 3 und PDF-Generierung (`lib/betreuungsvertrag*.ts`) nutzen dieselbe Quelle. PDF in `customer-documents`, Versand `/api/portal/contracts/send-email` + `lib/contract-email.ts`; Status `contract_email_*` auf `contacts`; Admin-Resend `/api/admin/customers/[id]/resend-contract-email`.
- Impfpass-Fotos pro Tier: mehrere Bilder in `documents` (`document_type=impfpass`, `page_category`, `description`); Storage `{customerId}/{petId}/impfpass/`. UI-Komponente `PetImpfpassGallery` (Tier-Formular + `/portal/documents`); QR-Upload via `impfpass_upload_sessions` und Mobile-Seite `/impfpass-upload/[id]`; Kategorien/Beispiele in `lib/impfpass-photo-categories.ts`.
- Dokument-Upload-Regeln: `pet_id` Pflicht bei Impfpass/Wurmtest; `description` Pflicht beim generischen Upload (Portal `/portal/documents`, Admin `DocumentManager`); serverseitig in `/api/portal/documents` und `/api/admin/documents`. Impfpass-Galerie: Beschreibung weiterhin optional.
- Konto-Löschung (DSGVO + Aufbewahrung): Kernlogik `lib/customer-deletion.ts`; Portal-Selbstlöschung `/api/portal/account` + UI auf `/portal/profile`; Admin-DELETE gleiche Funktion. Ohne Rechnung/Vertrag: Hard-Delete inkl. Auth-User. Mit Aufbewahrungspflicht: Anonymisierung von Stammdaten/Fotos/Impfpass, Erhalt von Buchungs-/Rechnungshistorie und Vertrag bis Fristende; Audit in `customer_deletion_log`. SevDesk bleibt unangetastet.

## Entscheidungen & Constraints
- Kundendokumente liegen zusätzlich in Supabase Storage im Bucket `customer-documents`.
- Auth-Konten und CRM-Kontakte sind getrennte Datensätze.
- Kunden-E-Mail (`contacts.email`) ist case-insensitiv eindeutig, zugleich Login- und Systemversandadresse; bei Portalzugang nur nach Kunden-/Auth-Bestätigung änderbar. Portal ist gegenüber SevDesk führend für die E-Mail.
- Datenbankänderungen werden als SQL-Migrationen unter `supabase/migrations` versioniert.
- Ausfallsichere Fallbacks: Alle CMS-unterstützten Seiten greifen bei fehlenden Daten auf originale, statische Inhalte zurück.
- Öffentliche Website: keine WhatsApp-Kontaktlinks auf Marketing-Seiten; Anfragen über E-Mail/Kontaktformular (`/#kontakt`).
- Rechtliches für WhatsApp-Gruppen: Link-Hub `/rechtliches` ohne Hauptnavigation; gleiche CMS-Keys wie `/agb` etc., Canonical auf volle URLs, Hub `noindex`.
- Geplante Jobs laufen über Supabase `pg_cron`/`pg_net`, nicht über Vercel Cron; Secrets im Supabase Vault.
- Gesetzliche Feiertage für Portal/Kalender/Schätzung: Nager.Date, Default-Region `DE-BW` (`HOLIDAY_REGION` / `HOLIDAY_COUNTRY`), serverseitig gecacht.
- Konto-Löschung: Aufbewahrungsfristen 10 Jahre (Rechnungen, Anker `booking_request_groups.sevdesk_invoice_synced_at`) bzw. 6 Jahre (Vertrag, Anker `contacts.contract_signed_at`). Tiere mit Buchungshistorie bei Anonymisierung nicht löschen (FK-Cascade auf `bookings`).
