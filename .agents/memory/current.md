# Aktueller Stand

## Letzte Änderungen
- Vertrags-Mail nach Onboarding repariert: PDF wird serverseitig aus Storage geladen (kein Base64-Body mehr → Vercel-Limit umgangen).
- Signatur-Kompression vor PDF-Einbettung; Mail-Fehler blockieren Onboarding-Abschluss.
- DB-Felder `contract_email_status`, `contract_email_error`, `contract_email_sent_at`; Admin kann Vertrags-Mail erneut senden.
- Nachversand an gabriel-haaga@gmx.de erfolgreich (SMTP lokal verifiziert).

## Fokus
- Deploy auf Vercel; SMTP-Env-Vars in Production gegen `.env.local` prüfen.
- Vault-Secrets und `CRON_SECRET` in Production prüfen/setzen.

## Nächste Schritte
- Deploy; Vertrags-Mail-Flow mit neuem Onboarding testen.
- Supabase Vault: `cron_secret` und `app_base_url` setzen; Vercel `CRON_SECRET` angleichen.
- Impf-Reminder und Admin-Impfübersicht manuell testen.

## Offene Punkte
- Vercel-Production: SMTP_* müssen gesetzt sein (lokal OK, Production separat prüfen vor Deploy).
- Vault-Secrets für Impf-Cron müssen in Supabase gesetzt sein, sonst nur Warning-Log.
- `public/images/tigube_logo_hund.jpg` fehlt im Repo.
- ESLint nicht installiert (`npm run lint` schlägt fehl).
