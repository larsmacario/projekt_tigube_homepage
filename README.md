# Tierisch Gut Betreut

Website und Verwaltungsportal für einen Tierbetreuungsservice (Hundepension, Katzenbetreuung).

## Tech-Stack

- Next.js 15, React 19, TypeScript
- Tailwind CSS, shadcn/ui
- Supabase (PostgreSQL, Auth, Storage, CMS)

## Befehle

```bash
npm run dev    # Entwicklungsserver (Turbopack)
npm run build  # Produktions-Build
npm run start  # Produktionsserver
npm run lint   # ESLint
```

## Struktur

- `app/` – Next.js App Router (öffentliche Seiten, Admin, Portal, API)
- `components/` – React-Komponenten
- `lib/` – Shared Logic (Auth, CMS, E-Mail, Types)
- `supabase/migrations/` – Datenbank-Migrationen

## CMS

Inhalte werden über Supabase (`cms_content`) verwaltet – Admin-Bereich unter `/admin/cms`.
