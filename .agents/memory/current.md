# Aktueller Stand

## Letzte Änderungen
- Die Bereiche Eigenschaften, Individuelle Preise und Gefahrenbereich in der Admin-Kundenkartei (`app/admin/customers/[id]/page.tsx`) wurden in die linke Spalte verschoben und befinden sich nun direkt unter den Persönlichen Daten. Dadurch erstrecken sie sich über dieselbe Breite wie die persönlichen Daten und die Sidebar bleibt rechts oben bündig.
- Im unverbindlichen Anfrageformular (ContactForm) wurden die Felder „Name“ und „Vorname“ getauscht, sodass das Feld „Vorname“ nun vor dem Feld „Name“ angezeigt wird.
- Der Bereich „Individuelle Preise“ in der Admin-Kundenkartei (`app/admin/customers/[id]/page.tsx`) wurde nach unten verschoben und befindet sich nun genau zwischen dem Eigenschaften-Bereich (Property-Editor) und dem Gefahrenbereich. Er erstreckt sich nun über die volle Seitenbreite.
- Das Grid-Layout der Admin-Kundenkartei (`app/admin/customers/[id]/page.tsx`) wurde angepasst. Die linke Spalte (Persönliche Daten & Individuelle Preise) und die rechte Sidebar (E-Mail, Notizen, Tiere, Dokumente, Buchungen) sind nun in zwei separaten Containern strukturiert. Dadurch startet die Sidebar ganz oben auf gleicher Höhe wie die persönlichen Daten.
- Bereich „Individuelle Preise“ in der Admin-Kundenkartei (`app/admin/customers/[id]/page.tsx`) ist jetzt auf- und zuklappbar und standardmäßig zugeklappt (Zustand wird über einen React-State gesteuert).
- Spalte `letzte_stuhlprobe` (Typ: `DATE`) im DB-Schema (Migration vorbereitet unter `/supabase/migrations`) und im TypeScript-Interface `Pet` in `lib/types.ts` hinzugefügt.
- Onboarding-Formular (`app/portal/profile/page.tsx`) und Tierverwaltung (`app/portal/pets/page.tsx`) um das Feld `letzte_stuhlprobe` und Pflichtfeld-Validierung für Dokumenten-Uploads (Impfpass, Wurmtest) und Stuhlproben-Datum erweitert.
- Zwischenspeichern des Onboardings durch den Button "Später fortfahren" ermöglicht (Kunde wird zum Dashboard zurückgeleitet).
- Dashboard-Banner so angepasst, dass es auf `customer.onboarding_completed` prüft und den Kunden direkt zum passenden unvollständigen Schritt weiterleitet.
- Datum der letzten Stuhlprobe wird nun in der Admin-Kundenkartei (`app/admin/customers/[id]/page.tsx`) angezeigt.
- Onboarding-Link bleibt im Admin-Bereich sichtbar, bis das Onboarding vollständig abgeschlossen ist. Bereits registrierte Kunden werden auf der Onboarding-Landingpage direkt zur Anmeldung weitergeleitet.
- Fehlerbehebung: Fehlendes `useRef` importiert und fehlende `isProfileComplete` im Dashboard-JSX wieder deklariert, um Client-Side Exceptions zu beheben.
- Fehlerbehebung: Dynamische Generierung der `baseUrl` in API-Routen anhand der Request-Header implementiert (Onboarding-Link zeigt nun live auf die korrekte Domain).
- Fehlerbehebung: Robuste Touch- und Maus-Event-Verarbeitung auf dem Unterschriften-Canvas sowie automatische Re-Initialisierung bei Ausrichtungswechseln (Landscape/Portrait) without Koordinaten-Versatz.
- Fehlerbehebung: Scroll-Verhalten auf der mobilen Unterschriften-Seite blockiert und UI extrem kompakt gestaltet, um Tastenbedienbarkeit im Landscape-Modus sicherzustellen.
- Fehlerbehebung: Desktop-Unterschriften-Initialisierung mittels Polling-Mechanismus robust gemacht, damit die Event-Listener beim ersten Aufruf von Schritt 3 sofort funktionieren.
- Fehlerbehebung: Cookies `sb-access-token` und `sb-refresh-token` beim Registrierungs-Endpunkt gesetzt und beim Logout-Endpunkt/Client-Handler gelöscht. Dies behebt die Desynchronisation zwischen Client (LocalStorage) und Next.js Server-APIs (Cookies) und verhindert "Nicht autorisiert" (401) nach der Onboarding-Registrierung.
- Textanpassung: Firmierung im Vertragstext der UI und im generierten PDF auf „tierisch gut betreut Gesellschaft mit beschränkter Haftung“ aktualisiert.

## Fokus
- Feature-Abnahme und manuelle Tests.

## Nächste Schritte
- Testen der Klapp-Funktion und der neuen Position für individuelle Preise.
- Testen der Sidebar-Ausrichtung auf Desktop.
- Manuelle Ausführung des SQL-Statements für `letzte_stuhlprobe` in der remote Supabase-Datenbank.
- Testen des vollständigen Onboarding-Flows (inklusive Zwischenspeichern und Fortsetzen).

## Offene Punkte
- Manuelle DB-Migration ausführen.
