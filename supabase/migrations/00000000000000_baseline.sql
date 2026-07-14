-- Baseline: Das Produktions-Schema wurde über 41 Remote-Migrationen aufgebaut (Dez 2025 – Jul 2026).
-- Vollständige Versionsliste: supabase/MIGRATIONS.md
--
-- Diese Datei markiert den Ausgangspunkt für lokale Inkrement-Migrationen.
-- Für einen Schema-Dump aus der Remote-DB (wenn CLI-Zugriff verfügbar):
--   npx supabase db dump --linked -f supabase/migrations/00000000000000_baseline.sql
--
-- Kern-Tabellen (contacts, users, pets, bookings, …) wurden remote angelegt und sind
-- in den nachfolgenden lokalen Migrationen nur noch per ALTER/CREATE IF NOT EXISTS erweitert.

SELECT 1;
