# Aktueller Stand

## Letzte Änderungen
- CMS-Speichern repariert: Admin-API nutzt Service-Role mit Fallback auf authentifizierten Client, `onConflict: 'key'` beim Upsert, `revalidatePath` nach Speichern.
- CMS-Seiten (`/`, `/hundepension`, `/katzenbetreuung`, Impressum/Datenschutz/AGB) auf `force-dynamic` – Frontend zeigt Änderungen sofort nach Speichern.
- Admin-CMS aktualisiert lokalen State nach erfolgreichem Speichern aus der API-Antwort.

## Fokus
- Fixes deployen (noch nicht auf Production), damit Speichern und Frontend-Sync online funktionieren.

## Nächste Schritte
- Änderungen committen und auf Vercel deployen.
- Auf Vercel prüfen: `SUPABASE_SERVICE_ROLE_KEY` ist gesetzt (Production + Preview).
- Nach Deploy: `/admin/cms` → Text ändern → Speichern → öffentliche Seite im Inkognito-Fenster prüfen.

## Offene Punkte
- Supabase CLI meldet 403 für `migration list`/`repair`.
- `public/images/tigube_logo_hund.jpg` fehlt im Repo.
- ESLint nicht installiert (`npm run lint` schlägt fehl).