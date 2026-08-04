# Aktueller Stand

## Letzte Änderungen
- Strukturierter Futter-/Medikamentenplan pro Tier: `pets.care_plan` (JSONB), UI in Onboarding, Meine Tiere, Admin PetManager; Buchungs-Wizard lädt Plan vorausgefüllt, Gate vor Schritt 2 bei Lücken.
- Änderungsprotokoll `pet_care_plan_changes` + Admin `/admin/care-plans` mit Nav-Badge; Druck unter Portal/Admin; Vertrag-PDF nutzt Plan-Kurzfassung.
- Dev-Fix HTTP 431: `lib/auth-cookies.ts` räumt alte Supabase-Cookies auf; `npm run dev` mit größerem Header-Limit.

## Fokus
- Pflegeplan manuell testen: Onboarding → Buchung → Admin-Badge → Druck.
- Kunden-Preis-UI und Legacy-Preistabellen-Abbau (parallel).

## Nächste Schritte
- Optional: Buchungs-Wizard Schritt 3 – Warnung bei Medikamenten-Extra ohne Plan; Mengenvorschlag aus Mahlzeiten-Slots.
- `20260804170100_drop_legacy_price_tables.sql` anwenden, wenn Preis-Migration stabil.

## Offene Punkte
- Bestehende Tiere mit nur Freitext (`futtermenge`/`medikamente`) → Banner „übertragen“, bis `care_plan` ausgefüllt.
- Keine E-Mail bei Planänderungen (nur Admin-Badge); keine Auto-Migration Freitext → Slots.
- Bei HTTP 431 in Dev: localhost-Cookies löschen und neu einloggen.
