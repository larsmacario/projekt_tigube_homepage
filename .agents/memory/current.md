# Aktueller Stand

## Letzte Änderungen
- **Google-Kalender (Admin):** OAuth + Vault unter `/admin/einstellungen`; FreeBusy blockiert buchbare Tage (Fail-open). Migration `20260923160000_google_calendar_integration.sql`.
- **Konto-Löschung (Portal + Admin):** `lib/customer-deletion.ts` mit zwei Pfaden – vollständige Löschung ohne Aufbewahrungspflicht, sonst Anonymisierung bis Fristablauf (Rechnungen 10 J. §147 AO, Vertrag 6 J. §257 HGB). Portal: Gefahrenzone auf `/portal/profile`, API `GET/DELETE /api/portal/account`, Bestätigung „LÖSCHEN“, Seite `/konto-geloescht`. Admin-DELETE nutzt dieselbe Logik. Migration `20260912140000_customer_account_deletion.sql` (remote angewendet): `deleted_at`, `anonymized_at`, `deletion_retention_until`, `status=deleted`, Audit `customer_deletion_log`.
- **Stammdaten bearbeiten:** war bereits über `/portal/profile` + `PUT /api/portal/profile` möglich (Name, Adresse, E-Mail, Telefon, Notfallkontakt).
- **Parallel uncommitted:** Pflegeplan-Versionen/Snapshots, Care-Plan-Admin, Bring-/Holzeiten-Referenz, Buchungswizard-Validierung.

## Fokus
- Konto-Löschung End-to-End auf Testkonto prüfen (Pfad A ohne Rechnung/Vertrag, Pfad B mit synced Rechnung oder unterschriebenem Vertrag).
- Uncommitted Changes committen und deployen.

## Nächste Schritte
- Manuell: Testkunde ohne Abrechnungsdaten → vollständige Löschung; Testkunde mit Rechnung/Vertrag → anonymisiert, Login sofort weg, Buchungshistorie bleibt.
- Commit + Deploy aller offenen Änderungen (Konto-Löschung, ggf. Care-Plans).

## Offene Punkte
- E2E-Löschtest auf echtem Testkonto noch ausstehend (kein Produktivkunde löschen).
- Storno-Abrechnung bewusst noch nicht im regulären Rechnungs-Sync.
- SevDesk-Kontakte bei Löschung unangetastet (bewusste Entscheidung).
