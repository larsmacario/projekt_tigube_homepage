# Aktueller Stand

## Letzte Änderungen
- **NewsBar Auto-Popup:** Betriebsferien-Dialog öffnet sich einmal pro Sitzung nach konfigurierbarer Verzögerung (DB: `auto_open_enabled`, `auto_open_delay_seconds`; Admin unter `/admin/newsbar`).
- **Next.js 16 Upgrade:** `next@16.3.8`, ESLint CLI statt `next lint`, `proxy.ts` statt `middleware.ts`, async Route-`params`, Build ohne TS/ESLint-Ignores, CI unter `.github/workflows/ci.yml`, Node 24 via `.nvmrc`/`engines`.

## Fokus
- NewsBar Auto-Popup manuell auf Startseite und Portal prüfen.

## Nächste Schritte
- Vercel Preview smoke-testen (ohne E-Mail/SevDesk/Cron-Schreibaktionen).
- Merge und Production-Deploy nach Freigabe.

## Offene Punkte
- E2E-Löschtest Konto weiterhin ausstehend.
- ESLint: 104 Warnungen (v. a. ungenutzte Variablen); `no-explicit-any` bewusst deaktiviert für Legacy-Code.
