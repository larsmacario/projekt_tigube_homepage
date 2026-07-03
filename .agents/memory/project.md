# Projekt: Tierisch Gut Betreut

## Ziel
Website und Verwaltungsportal für einen Tierbetreuungsservice. Das CRM verwaltet Kontaktanfragen als Leads und konvertierte Kunden.

## Tech-Stack
- Next.js 15, React 19 und TypeScript
- Tailwind CSS, shadcn/ui und Lucide React
- Supabase für PostgreSQL, Authentifizierung, Storage und CMS
- Custom CMS über Supabase JSONB-Tabelle `cms_content` und Storage-Bucket `cms-assets`

## Architektur
- App Router mit Client-Seiten im Admin-Bereich und Route Handlers unter `app/api`.
- Integrierte Admin-Oberfläche unter `/admin/cms` zur Inhaltsverwaltung aller statischen, Unter- und Rechtsseiten.
- Die Tabelle `contacts` enthält Leads und Kunden über `contact_type`; weitere CRM-Daten referenzieren diese ID.
- Admin-Zugriffe werden in jeder API-Route über die Supabase-Rolle `admin` geprüft.

## Entscheidungen & Constraints
- Kundendokumente liegen zusätzlich in Supabase Storage im Bucket `customer-documents`.
- Auth-Konten und CRM-Kontakte sind getrennte Datensätze.
- Datenbankänderungen werden als SQL-Migrationen unter `supabase/migrations` versioniert.
- Ausfallsichere Fallbacks: Alle CMS-unterstützten Seiten greifen bei fehlenden Daten auf originale, statische Inhalte zurück.
