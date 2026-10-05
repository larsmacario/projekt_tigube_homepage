# Aktueller Stand

## Letzte Änderungen
- **Buchungen anpassbar:** Portal + Admin „Zeitraum anpassen“ (`BookingModificationDialog`, APIs `/modification`). Domäne `lib/booking-modification.ts`, Storno-Vorschau extrahiert (`lib/cancellation-preview.ts`). Pending ohne Gebühr; approved entfernte Tage mit Stornopolitik; Admin optional `waiveCancellation`.

## Fokus
- Manuell: Anpassung pending/approved (Pension + Tagesbetreuung), Stornovorschau.

## Nächste Schritte
- Optional: `appointment_plan` bei Datumsänderung synchronisieren.
- Commit/Deploy wenn gewünscht.

## Offene Punkte
- E2E-Löschtest Konto weiterhin ausstehend.
