# Aktueller Stand

## Letzte Änderungen
- RLS für Newsletter-Tabellen (`newsletter_topics`, `newsletter_templates`, `newsletter_campaigns`, `newsletter_send_logs`) und `contact_emails` aktiviert – Admin-only-Policies (Migration `20260714170000_enable_rls_newsletter_and_contact_emails.sql`, remote angewendet).
- Projekt-Aufräumung abgeschlossen: Sanity-Überreste entfernt (npm-Pakete, Skill, README), `memory-bank/` gelöscht, ~30 ungenutzte shadcn-Komponenten und tote API-Routen entfernt, deprecated Type-Aliase (`ContactRequest`, `LeadNote`) bereinigt.
- Migrationen konsolidiert: `00000000000000_baseline.sql` angelegt, No-Op-Platzhalter und redundante Legal-Seed-Migration entfernt, `testimonials_rows.sql` gelöscht, `supabase/MIGRATIONS.md` und `scripts/sync-migrations.sh` für Remote-Sync dokumentiert.
- npm-Dependencies von ~1377 auf ~275 Pakete reduziert (Sanity, recharts, cmdk, vaul, react-hook-form u. a. entfernt).

## Fokus
- Migration-Sync mit Remote-DB abschließen (CLI-Zugriff mit ausreichenden Rechten erforderlich).

## Nächste Schritte
- `scripts/sync-migrations.sh` ausführen, sobald Supabase-CLI-Account Zugriff hat.
- Optional: Schema-Dump via `npx supabase db dump --linked` für vollständige Baseline.

## Offene Punkte
- Supabase CLI meldet 403 (Account-Rechte) für `migration list`/`repair` – manuell über Dashboard oder höhere CLI-Rolle lösen.
- `public/images/tigube_logo_hund.jpg` fehlt im Repo (Metadata in `layout.tsx` verweist darauf).
- ESLint nicht installiert (`npm run lint` schlägt fehl – vorbestehend).