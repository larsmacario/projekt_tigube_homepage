-- Bestehende nicht archivierte Zusatzleistungen standardmäßig abrechenbar

UPDATE public.addon_services
SET is_billable = true
WHERE archived_at IS NULL
  AND is_billable = false;
