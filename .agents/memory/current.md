# Aktueller Stand

## Letzte Änderungen
- Spalte `letzte_stuhlprobe` (Typ: `DATE`) im DB-Schema (Migration vorbereitet unter `/supabase/migrations`) und im TypeScript-Interface `Pet` in `lib/types.ts` hinzugefügt.
- Onboarding-Formular (`app/portal/profile/page.tsx`) und Tierverwaltung (`app/portal/pets/page.tsx`) um das Feld `letzte_stuhlprobe` und Pflichtfeld-Validierung für Dokumenten-Uploads (Impfpass, Wurmtest) und Stuhlproben-Datum erweitert.
- Zwischenspeichern des Onboardings durch den Button "Später fortfahren" ermöglicht (Kunde wird zum Dashboard zurückgeleitet).
- Dashboard-Banner so angepasst, dass es auf `customer.onboarding_completed` prüft und den Kunden direkt zum passenden unvollständigen Schritt weiterleitet.
- Datum der letzten Stuhlprobe wird nun in der Admin-Kundenkartei (`app/admin/customers/[id]/page.tsx`) angezeigt.
- Onboarding-Link bleibt im Admin-Bereich sichtbar, bis das Onboarding vollständig abgeschlossen ist. Bereits registrierte Kunden werden auf der Onboarding-Landingpage direkt zur Anmeldung weitergeleitet.
- Fehlerbehebung: Fehlendes `useRef` importiert und fehlende `isProfileComplete` im Dashboard-JSX wieder deklariert, um Client-Side Exceptions zu beheben.
- Fehlerbehebung: Dynamische Generierung der `baseUrl` in API-Routen anhand der Request-Header implementiert (Onboarding-Link zeigt nun live auf die korrekte Domain).
- Fehlerbehebung: Robuste Touch- und Maus-Event-Verarbeitung auf dem Unterschriften-Canvas implementiert und Initialisierung nach Abschluss des Seiten-Ladevorgangs korrigiert.

## Fokus
- Feature-Abnahme und manuelle Tests.

## Nächste Schritte
- Manuelle Ausführung des SQL-Statements für `letzte_stuhlprobe` in der remote Supabase-Datenbank.
- Testen des vollständigen Onboarding-Flows (inklusive Zwischenspeichern und Fortsetzen).

## Offene Punkte
- Manuelle DB-Migration ausführen.
