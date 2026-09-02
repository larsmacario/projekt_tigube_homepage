-- SevDesk Artikel-Sync für prices und addon_services

ALTER TABLE public.prices
  ADD COLUMN IF NOT EXISTS sevdesk_part_number TEXT,
  ADD COLUMN IF NOT EXISTS sevdesk_sync_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sevdesk_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sevdesk_sync_error TEXT;

ALTER TABLE public.prices
  DROP CONSTRAINT IF EXISTS prices_sevdesk_sync_status_check;

ALTER TABLE public.prices
  ADD CONSTRAINT prices_sevdesk_sync_status_check
  CHECK (sevdesk_sync_status IN ('none', 'pending', 'synced', 'failed'));

ALTER TABLE public.addon_services
  ADD COLUMN IF NOT EXISTS sevdesk_part_number TEXT,
  ADD COLUMN IF NOT EXISTS sevdesk_sync_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sevdesk_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sevdesk_sync_error TEXT;

ALTER TABLE public.addon_services
  DROP CONSTRAINT IF EXISTS addon_services_sevdesk_sync_status_check;

ALTER TABLE public.addon_services
  ADD CONSTRAINT addon_services_sevdesk_sync_status_check
  CHECK (sevdesk_sync_status IN ('none', 'pending', 'synced', 'failed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_prices_sevdesk_article_id
  ON public.prices (sevdesk_article_id)
  WHERE sevdesk_article_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_addon_services_sevdesk_article_id
  ON public.addon_services (sevdesk_article_id)
  WHERE sevdesk_article_id IS NOT NULL;

ALTER TABLE public.sevdesk_sync_runs
  DROP CONSTRAINT IF EXISTS sevdesk_sync_runs_run_type_check;

ALTER TABLE public.sevdesk_sync_runs
  ADD CONSTRAINT sevdesk_sync_runs_run_type_check
  CHECK (run_type IN ('customer_import', 'invoice_sync', 'article_import'));

ALTER TABLE public.sevdesk_settings
  ADD COLUMN IF NOT EXISTS last_article_import_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_article_import_summary JSONB;
