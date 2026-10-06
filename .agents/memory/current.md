# Aktueller Stand

## Letzte Änderungen
- **Next.js 16 Upgrade:** `next@16.3.8`, ESLint CLI statt `next lint`, `proxy.ts` statt `middleware.ts`, async Route-`params`, Build ohne TS/ESLint-Ignores, CI unter `.github/workflows/ci.yml`, Node 24 via `.nvmrc`/`engines`.

## Fokus
- Branch `upgrade/next-16` bereit für Review/Preview-Deploy.

## Nächste Schritte
- Vercel Preview smoke-testen (ohne E-Mail/SevDesk/Cron-Schreibaktionen).
- Merge und Production-Deploy nach Freigabe.

## Offene Punkte
- E2E-Löschtest Konto weiterhin ausstehend.
- ESLint: 104 Warnungen (v. a. ungenutzte Variablen); `no-explicit-any` bewusst deaktiviert für Legacy-Code.
