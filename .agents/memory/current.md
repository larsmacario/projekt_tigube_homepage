# Aktueller Stand

## Letzte Änderungen
- **Buchungskalender vereinfacht:** Portal-Wizard Schritt 2 in `booking-days-and-times.tsx` – ein Kalender pro Leistung, Zeit-Chips, Wiederholen (Nein/wöchentlich/14 Tage) statt Radio Einmalig/Feste Tage. Buchungshorizont bis 31.12. Folgejahr (`lib/booking-horizon.ts`). Serien überspringen Betriebsferien/Schließtage. `appointment_plan` JSONB auf `booking_request_groups`, Zuschläge je Termin. Admin-Buchungskalender lädt Ferien/Schließtage wie Kundenportal.

## Fokus
- Manueller Browser-Check: `/portal/bookings/new`, `/admin/bookings` (Monat/Woche).

## Nächste Schritte
- Optional: pro-Tag-Zeit-Overrides in der UI (Datenmodell vorbereitet).
- Commit/Deploy wenn gewünscht.

## Offene Punkte
- E2E-Löschtest Konto weiterhin ausstehend.
