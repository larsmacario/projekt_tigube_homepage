# Aktueller Stand

## Letzte Änderungen
- Vertrags-Mail nach Onboarding: PDF serverseitig aus Storage (`lib/contract-email.ts`), kein Base64 mehr; Signatur-Kompression; Versandstatus auf `contacts`; Admin-Nachversand unter Kundendetail.
- SevDesk Phase 1: Vault-Key, `sevdesk_settings`, `/admin/einstellungen`, `lib/sevdesk.ts` (Migration auf Remote).

## Fokus
- Deploy (Vertrags-Mail-Fix + SevDesk); SMTP_* in Vercel Production mit `.env.local` abgleichen.
- SevDesk mit echtem API-Token testen; Rechnungen aus Buchungen vorbereiten.

## Nächste Schritte
- Nach Deploy: Onboarding Schritt 3 (Vertrag + Mail) und Admin „Vertrags-Mail erneut senden“ testen.
- SevDesk-Rechnungen aus bestätigten Buchungen/`booking_line_items` (Kontakt-Mapping).
- Vault `cron_secret` / `app_base_url` und Vercel `CRON_SECRET` prüfen.

## Offene Punkte
- Gabriel-Nachversand lokal erfolgreich; GMX/Admin-Zustellung in Production nach Deploy bestätigen.
- Live-Test SevDesk nur mit Nutzer-Key; `tigube_logo_hund.jpg` fehlt; `npm run lint` ohne ESLint.
