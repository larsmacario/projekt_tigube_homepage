# Aktueller Stand

## Letzte Änderungen
- Smarte Hunde-Impferfassung im Portal/Onboarding: Kombiimpfung (Datum + Intervall jährlich/2 Jahre) + separates Zwingerhusten-Datum; Soft-Pflicht mit Dashboard-Hinweis.
- Impf-Erinnerungen per E-Mail (4 und 2 Wochen vor Fälligkeit), Log in `pet_vaccination_reminder_log`.
- Cron über Supabase `pg_cron` + `pg_net` (Funktion `trigger_vaccination_reminders`), nicht Vercel Cron; Secrets `cron_secret` + `app_base_url` im Supabase Vault, `CRON_SECRET` zusätzlich in Vercel.
- Admin-Impfübersicht: `/admin/impfungen` mit Tabelle/Filtern, API `/api/admin/vaccinations/upcoming`, Vorschau auf `/admin/dashboard`.

## Fokus
- Vault-Secrets und `CRON_SECRET` in Production prüfen/setzen.
- Impf-Reminder und Admin-Impfübersicht manuell testen (überfällig, in 14 Tagen, unvollständige Daten).

## Nächste Schritte
- Supabase Vault: `cron_secret` und `app_base_url` setzen; Vercel `CRON_SECRET` angleichen.
- Deploy auf Vercel; Test: Hund anlegen, `/admin/impfungen`, Cron manuell via `SELECT public.trigger_vaccination_reminders();`
- Offene CMS-Fixes deployen.

## Offene Punkte
- Vault-Secrets für Impf-Cron müssen in Supabase gesetzt sein, sonst nur Warning-Log.
- Supabase CLI meldet ggf. 403 für `migration list`/`repair`.
- `public/images/tigube_logo_hund.jpg` fehlt im Repo.
- ESLint nicht installiert (`npm run lint` schlägt fehl).
