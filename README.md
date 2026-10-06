# Tierisch Gut Betreut

Website und Verwaltungsportal für einen Tierbetreuungsservice (Hundepension, Katzenbetreuung).

## Tech-Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS, shadcn/ui
- Supabase (PostgreSQL, Auth, Storage, CMS)
- Node.js 24 (siehe `.nvmrc`)

## Befehle

```bash
npm run dev        # Entwicklungsserver
npm run build      # Produktions-Build
npm run start      # Produktionsserver
npm run test       # Vitest (Unit-Tests)
npm run typecheck  # TypeScript ohne Emit
npm run lint       # ESLint
```

CI (GitHub Actions): Install, Tests, Typecheck, Lint und Build auf Node 24.

## Struktur

- `app/` – Next.js App Router (öffentliche Seiten, Admin, Portal, API)
- `components/` – React-Komponenten
- `lib/` – Shared Logic (Auth, CMS, E-Mail, Types)
- `proxy.ts` – Legacy-URL-Redirects (ehem. `middleware.ts`)
- `supabase/migrations/` – Datenbank-Migrationen

## CMS

Inhalte werden über Supabase (`cms_content`) verwaltet – Admin-Bereich unter `/admin/cms`.
