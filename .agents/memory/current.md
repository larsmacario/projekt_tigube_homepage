# Aktueller Stand

## Letzte Änderungen
- Button Klick-Feedback & Loading-States: Zentrale Button-Komponente um taktiles Feedback (`active:scale-[0.98]`) und `loading`-Prop mit rotierendem Spinner erweitert.
- Admin- & Kundenportal: Alle asynchronen Aktionen (Lead zum Kunden konvertieren, Leads/Kunden löschen, Notizen speichern, Onboarding-Einladungen senden, Preise/CMS speichern, Tier anlegen/löschen, Dokumentenupload, Buchungen absenden, Signatur übermitteln) mit Lade-Zuständen und Spinnern ausgestattet.
- CMS Stornierungsbedingungen: Button „Abschnitt hinzufügen“ funktioniert wieder in Hundepension, Katzenbetreuung und Kundenportal.
- Ursache: `normalizeCancellationSections` hat leere Editor-Platzhalter beim Re-Render entfernt; Fix via `getCancellationSectionsForEditor` in `lib/cms/cancellation-policy.ts`.
- `mergeKundenportalData` re-normalisiert vorhandene `cancellationSections` nicht mehr; Regressionstests in `lib/cms/cancellation-policy.test.ts`.

## Fokus
- CMS Storno-Abschnitte manuell testen (`/admin/cms` → Abschnitt hinzufügen, speichern, neu laden).
- SevDesk-Kundenimport und Rechnungsentwürfe weiter testen (Tag `aktiv`, Artikel-IDs in Preisverwaltung).

## Nächste Schritte
- Optional: separater SevDesk-Entwurfsprozess für Storno-Gebühren/Gutschriften (`cancellation_financial_status`).
- Buchungs-Wizard: Medikamenten-Warnung bei Extra ohne Plan.

## Offene Punkte
- Storno-Abrechnung bewusst noch nicht im regulären Rechnungs-Sync (nur manuell markiert).
- Rechnungsentwürfe erfordern gepflegte `booking_line_items` und SevDesk-Kundenverknüpfung.
- Bei HTTP 431 in Dev: localhost-Cookies löschen und neu einloggen.
