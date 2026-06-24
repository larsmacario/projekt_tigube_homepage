# Projekt: Tierisch Gut Betreut

## Sprache
Antworte auf Deutsch.

## Was das ist
Next.js-Webseite mit Admin-CRM für Leads, Kunden, Buchungen und Kundenportal.
Die Datenhaltung und Authentifizierung laufen über Supabase.

## Wichtige Befehle
- Dev: `npm run dev`
- Build: `npm run build`
- Test: Kein separater Testbefehl konfiguriert

## Konventionen
- Admin-API-Routen prüfen die Rolle `admin` serverseitig.
- CRM-Kontakte liegen konsolidiert in `contacts` und werden über `contact_type` unterschieden.
- UI-Komponenten basieren auf Tailwind, shadcn/ui und Lucide.

## Memory
Lies zu Beginn jeder Session `.agents/memory/project.md` und `.agents/memory/current.md`.
Bei `update memory`: aktualisiere `current.md`, `project.md` nur bei Architektur-Änderungen.
