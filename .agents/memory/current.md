# Aktueller Stand

## Letzte Änderungen
- Betreuungsvertrag vereinheitlicht: CMS-Key `agb` (wie `/agb`) ist die Textquelle für Onboarding Schritt 3 und neu erzeugte PDFs (`lib/betreuungsvertrag.ts`, `betreuungsvertrag-html.ts`, `betreuungsvertrag-pdf.ts`); Portal lädt via `/api/cms?key=agb`, PDF ergänzt Vertragsparteien, Foto/Video-Status, Unterschrift.
- Test `lib/betreuungsvertrag-html.test.ts` sichert Abschnittsreihenfolge; Build und Vitest grün.

## Fokus
- Vertrag in Production kurz gegen `/agb` und ein frisch unterzeichnetes PDF prüfen (Onboarding Schritt 3).
- Buchungswizard: Feiertage, Bring/Hol, Schritt-4-Schätzung.

## Nächste Schritte
- Manuell: Onboarding → Vertrag lesen/unterschreiben → PDF im Portal und Mail-Anhang mit `/agb` vergleichen.
- Optional Feiertags-Legende auf `/portal/bookings`; Katalog-Posten für 8‑€-Zeitaufpreis; `/rechtliches` Mobile.

## Offene Punkte
- Bereits gespeicherte Vertrags-PDFs vor dem Release behalten alten Wortlaut (nur neue Signaturen betroffen).
- Mittagsfenster 12–14: nur Hinweis (v1); ESLint fehlt für `npm run lint`; SMTP in Production verifizieren.
