-- Neue Zusatzleistungen standardmäßig abrechenbar

ALTER TABLE public.addon_services
  ALTER COLUMN is_billable SET DEFAULT true;
