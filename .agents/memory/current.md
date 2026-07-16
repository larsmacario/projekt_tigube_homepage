# Aktueller Stand

## Letzte Änderungen
- Anpassbare Spalten-Views für `/admin/leads`: Sichtbarkeit, Reihenfolge und Breite pro Spalte.
- Neue Tabelle `admin_table_views` (Migration `20260716180000_create_admin_table_views.sql`) mit persönlichen und globalen Views, RLS für Admins.
- API unter `/api/admin/table-views` (CRUD), Spaltenkatalog in `lib/table-columns.ts` erweitert (alle Lead-`contacts`-Felder + Custom Properties).
- UI: `ColumnViewMenu` auf der Leads-Seite mit View-Auswahl, Spalten-Popover (Checkbox + Drag) und Speichern persönlich/global.

## Fokus
- Migration `admin_table_views` auf Supabase anwenden und Leads-Spalten-Views manuell testen.
- Offene CMS-Fixes deployen (noch nicht auf Production).

## Nächste Schritte
- Migration deployen (`supabase db push` oder manuell).
- Auf `/admin/leads` testen: Standard-View, persönliche View, globale View, Reload, zweiter Admin.
- Änderungen committen und auf Vercel deployen.
- Optional: gleiches View-Pattern später für `/admin/customers`.

## Offene Punkte
- Migration `admin_table_views` noch nicht auf Remote angewendet (lokal vorhanden).
- Supabase CLI meldet 403 für `migration list`/`repair`.
- `public/images/tigube_logo_hund.jpg` fehlt im Repo.
- ESLint nicht installiert (`npm run lint` schlägt fehl).
