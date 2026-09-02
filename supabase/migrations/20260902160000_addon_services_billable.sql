-- Abrechenbar getrennt von Wizard-Freigabe (is_active)

ALTER TABLE public.addon_services
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_addon_services_billable_sort
  ON public.addon_services (is_billable, sort_order)
  WHERE is_billable = true AND archived_at IS NULL;

UPDATE public.addon_services
SET is_billable = true
WHERE is_active = true;
