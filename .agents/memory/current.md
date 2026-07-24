# Aktueller Stand

## Letzte Änderungen
- Portal-Buchungswizard (4 Schritte): Kostenschätzung, Zusatzleistungen pro Tier, Mengen-Vorschlag am Zeitraum (`lib/booking-extra-quantity.ts`), Override durch Kunde.
- Nach Buchungsanfrage: SMTP an `SMTP_TO` (info@…) und Bestätigung an Kunden-E-Mail (`sendBookingRequestEmails`, `lib/booking-request-email.ts`, `/api/portal/bookings`).
- Migration `extra_feeding_quantity_hint` auf Remote angewendet (Fütterung: „1 Fütterung pro Tag“ in Preisbeschreibung).
- Öffentliche Website: WhatsApp entfernt; Migration `20260724280000_remove_whatsapp_from_cms.sql` – auf Remote noch prüfen/anwenden.

## Fokus
- Deploy; Buchungsflow + E-Mail-Versand in Staging/Production mit SMTP testen.
- CMS-WhatsApp-Migration und Live-Seiten prüfen.

## Nächste Schritte
- Test: Portal-Anfrage → zwei Mails (intern + Kunde); Logs bei SMTP-Fehler.
- Migration `20260724280000` auf Remote, falls noch offen.
- SevDesk, Vertrags-Mail, Cron-Secrets wie zuvor.

## Offene Punkte
- Kundenportal ggf. noch „Stornierung … WhatsApp“ in Portal-CMS/Fallback.
- SMTP in Production; `tigube_logo_hund.jpg`; ESLint fehlt für `npm run lint`.
