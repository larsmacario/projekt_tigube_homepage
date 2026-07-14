# Aktueller Stand

## Letzte Änderungen
- SEO-Optimierung der öffentlichen Website durchgeführt: OpenGraph, Twitter-Cards und Canonical Links im globalen Layout integriert. LocalBusiness strukturierte Daten (JSON-LD) auf der Startseite eingebunden. Dynamische Metadaten (generateMetadata) für Hundepension, Katzenbetreuung, Impressum, Datenschutz und AGB implementiert. Layout-basierte statische Metadaten für Kundenstimmen hinzugefügt. Dynamische sitemap.ts und robots.ts zur Suchmaschinen-Steuerung und zum Ausschluss geschützter Routen (Admin, Portal) erstellt.
- Loadingstates vereinheitlicht: Die Ladeanimationen (Loadingstate) in den Bereichen CMS (`/admin/cms`) und Admins (`/admin/admins`) wurden an das standardmäßige Layout mit der rotierenden sage-farbenen CSS-Border-Animation angepasst, die auch bei Leads und Kunden verwendet wird.
- Admin-Verwaltung und Einladungsfunktion: Vollständige Admin-Verwaltung unter `/admin/admins` und Registrierungsseite unter `/admin/accept-invitation/[token]` implementiert. Admins können neue Teammitglieder per E-Mail einladen (E-Mail, Vorname, Nachname erforderlich). Es wurden neue API-Routen für Einladungsverwaltung (`/api/admin/invites`, `/api/admin/invites/[id]`, `/api/admin/invites/verify`, `/api/admin/invites/accept`) und für Admin-Benutzer (`/api/admin/users`, `/api/admin/users/[id]`) zur Auflistung, Bearbeitung und Löschung erstellt. Die Tabelle `public.users` und das TypeScript-Interface `User` wurden um die Spalten/Eigenschaften `vorname` und `nachname` erweitert.
- Kunden einladen: Funktion „Kunde einladen“ im Admin-Dashboard (Kundenliste) implementiert. Neue API-Route (`/api/admin/customers/invite`) zur Prüfung existierender Kontakte (Konvertiert Leads automatisch zu Kunden bei E-Mail-Übereinstimmung), Erstellung von Onboarding-Tokens und Versand der Onboarding-E-Mail via SMTP und Webhook. Frontend um ein Modal-Dialogfeld (Vorname, Nachname, E-Mail) erweitert.
- Die beiden Checklisten-Karten im Dashboard des Kundenportals (`app/portal/page.tsx`) wurden in einem zweispaltigen Grid-Layout nebeneinander platziert.
- Im Lead-Bereich (Lead-Detailseite, Admin-Dashboard, Onboarding-Willkommensseite und Spaltenlayout in den Listen-Tabellen) wurde die Namensreihenfolge ebenfalls auf „Vorname Nachname“ bzw. Vorname-Spalte vor Nachname-Spalte angepasst.
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
- Fehlerbehebung: Robuste Touch- und Maus-Event-Verarbeitung auf dem Unterschriften-Canvas sowie automatische Re-Initialisierung bei Ausrichtungswechseln (Landscape/Portrait) ohne Koordinaten-Versatz.
- Fehlerbehebung: Scroll-Verhalten auf der mobilen Unterschriften-Seite blockiert und UI extrem kompakt gestaltet, um Tastenbedienbarkeit im Landscape-Modus sicherzustellen.
- Fehlerbehebung: Desktop-Unterschriften-Initialisierung mittels Polling-Mechanismus robust gemacht, damit die Event-Listener beim ersten Aufruf von Schritt 3 sofort funktionieren.
- Fehlerbehebung: Cookies `sb-access-token` und `sb-refresh-token` beim Registrierungs-Endpunkt gesetzt und beim Logout-Endpunkt/Client-Handler gelöscht. Dies behebt die Desynchronisation zwischen Client (LocalStorage) und Next.js Server-APIs (Cookies) und verhindert "Nicht autorisiert" (401) nach der Onboarding-Registrierung.
- Textanpassung: Firmierung im Vertragstext der UI und im generierten PDF auf „tierisch gut betreut Gesellschaft mit beschränkter Haftung“ aktualisiert.

## Fokus
- Verifizierung der Admin-Verwaltung und Testen des Registrierungs-Flows für Admins.

## Nächste Schritte
- Ausführen der SQL-Migration (`supabase/migrations/20260708080000_create_admin_invitations.sql`) in der remote Supabase-Datenbank.
- Testen der Einladungsfunktion für Admins im Admin-Dashboard unter dem neuen Menüpunkt „Admins“.
- Testen des vollständigen Registrierungsflows für Admins über den generierten Einladungslink.
- Testen der Bearbeitungs- und Löschfunktion für Admins sowie der Stornierung offener Einladungen.

## Offene Punkte
- Ausführen der SQL-Migrationen (für `letzte_stuhlprobe` und `admin_invitations`) in der remote Supabase-Datenbank.
