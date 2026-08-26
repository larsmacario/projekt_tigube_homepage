# Aktueller Stand

## Letzte Änderungen
- Springer-Liste, 14-Tage-Rhythmus und Urlaubs-Teilstornos umgesetzt.
- `day_care_interval_weeks` (1|2) inkl. Kalender-/Kapazitätslogik über 12 Monate; Migration `20260826092036_springer_list_and_daycare_interval.sql`.
- Portal: Interval-Auswahl, Springer-Seite, Urlaub/Platz freigeben für Regeltermine.
- Admin: Buchungen-Tab Springer, Dashboard-Link; Teilstorno-Events mit Preis-Snapshot.

## Fokus
- Migration remote anwenden und End-to-End testen (Rhythmus, Teilstorno, Springer-Einladung/Annahme).

## Nächste Schritte
- Manuell: Regeltermin 14-Tage anlegen, genehmigen (12-Monats-Kapazität), Urlaubstage freigeben, Springer einladen und annehmen.
- Optional: SevDesk-Storno-Abrechnung für Teilstornos.

## Offene Punkte
- Storno-Abrechnung bewusst noch nicht im regulären Rechnungs-Sync.
- Rechnungsentwürfe erfordern gepflegte `booking_line_items` und SevDesk-Kundenverknüpfung.
