-- Archivierung für Zusatzleistungen (getrennt von Wizard-Freigabe is_active)

ALTER TABLE public.addon_services
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_addon_services_archived_sort
  ON public.addon_services (archived_at, sort_order);
