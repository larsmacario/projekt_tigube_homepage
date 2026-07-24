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
- Impf-Erinnerungen: täglicher Supabase-Cron ruft Next.js-Route `/api/cron/vaccination-reminders` auf; Versand-Log in `pet_vaccination_reminder_log`.
- Admin-Impfübersicht unter `/admin/impfungen` via `/api/admin/vaccinations/upcoming`.
- Kundenportal: Mehr-Tier-Buchungsanfragen unter `/portal/bookings` (Wizard, Verfügbarkeit, gruppierte `bookings` + optionale `booking_line_items` für Zusatzleistungen/Rechnungsvorbereitung).
- SevDesk (Rechnungen): API-Key verschlüsselt im Supabase Vault; Status in `sevdesk_settings`; Verwaltung `/admin/einstellungen`; HTTP-Client `lib/sevdesk.ts`; `prices.sevdesk_article_id` für Artikel-Mapping. Automatische Rechnungserstellung aus Buchungen folgt separat.
- Pflegevertrag nach Onboarding: PDF in `customer-documents`, Versand über `/api/portal/contracts/send-email` und `lib/contract-email.ts` (Storage-Download); Status `contract_email_*` auf `contacts`; Admin `/api/admin/customers/[id]/resend-contract-email`.
- Preis-Katalog: `prices` + Overrides in `customer_prices` / `group_prices` (optional Sonderpreis und Rabatt €/%); effektive Anzeige über `lib/price-override.ts` und `/api/prices` (Kunde schlägt Gruppe).

## Entscheidungen & Constraints
- Kundendokumente liegen zusätzlich in Supabase Storage im Bucket `customer-documents`.
- Auth-Konten und CRM-Kontakte sind getrennte Datensätze.
- Datenbankänderungen werden als SQL-Migrationen unter `supabase/migrations` versioniert.
- Ausfallsichere Fallbacks: Alle CMS-unterstützten Seiten greifen bei fehlenden Daten auf originale, statische Inhalte zurück.
- Geplante Jobs laufen über Supabase `pg_cron`/`pg_net`, nicht über Vercel Cron; Secrets im Supabase Vault.
