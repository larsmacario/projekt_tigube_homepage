# Aktueller Stand

## Letzte Änderungen
- Sanity.io vollständig deintegriert und durch ein internes Custom CMS in Supabase abgelöst.
- SQL-Migration `20260703160000_create_cms_content.sql` mit Tabellen-Definition, RLS-Policies, Storage-Bucket `cms-assets` und initialen Daten-Seeds angelegt.
- API-Routen `app/api/cms/route.ts` (public GET), `app/api/admin/cms/route.ts` (admin GET/PUT) und `app/api/admin/cms/upload/route.ts` (admin image upload) implementiert.
- Admin-Oberfläche unter `/admin/cms` mit Tabs für alle Seiten (Startseite, Hundepension, Katzenbetreuung, AGB, Datenschutz, Impressum) gebaut.
- Alle Seiten an das Supabase CMS mit ausfallsicheren, statischen Fallbacks angebunden.
- Erfolgreicher Next.js-Produktions-Build (`npm run build`) verifiziert.

## Fokus
- CMS-Bereitstellung und Verifizierung.

## Nächste Schritte
- SQL-Migration auf der Live-Datenbank ausführen (z. B. über Supabase Dashboard SQL Editor oder CLI).
- Testen der Inhaltsbearbeitung und Bild-Uploads im Admin-Panel unter `/admin/cms`.

## Offene Punkte
- Keine.
