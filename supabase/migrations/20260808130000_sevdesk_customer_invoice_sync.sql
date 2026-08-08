-- SevDesk Kunden- und Rechnungssync

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS sevdesk_contact_id TEXT,
  ADD COLUMN IF NOT EXISTS sevdesk_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sevdesk_sync_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_sevdesk_contact_id
  ON public.contacts (sevdesk_contact_id)
  WHERE sevdesk_contact_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_kundennummer_customer
  ON public.contacts (kundennummer)
  WHERE contact_type = 'customer' AND kundennummer IS NOT NULL AND btrim(kundennummer) <> '';

ALTER TABLE public.booking_request_groups
  ADD COLUMN IF NOT EXISTS sevdesk_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS sevdesk_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS sevdesk_invoice_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sevdesk_invoice_sync_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sevdesk_invoice_sync_error TEXT;

ALTER TABLE public.booking_request_groups
  DROP CONSTRAINT IF EXISTS booking_request_groups_sevdesk_invoice_sync_status_check;

ALTER TABLE public.booking_request_groups
  ADD CONSTRAINT booking_request_groups_sevdesk_invoice_sync_status_check
  CHECK (sevdesk_invoice_sync_status IN ('none', 'pending', 'synced', 'failed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_request_groups_sevdesk_invoice_id
  ON public.booking_request_groups (sevdesk_invoice_id)
  WHERE sevdesk_invoice_id IS NOT NULL;

ALTER TABLE public.addon_services
  ADD COLUMN IF NOT EXISTS sevdesk_article_id TEXT;

ALTER TABLE public.sevdesk_settings
  ADD COLUMN IF NOT EXISTS last_customer_import_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_customer_import_summary JSONB;

CREATE TABLE IF NOT EXISTS public.sevdesk_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL CHECK (run_type IN ('customer_import', 'invoice_sync')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  finished_at TIMESTAMPTZ,
  initiated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sevdesk_sync_runs_type_started
  ON public.sevdesk_sync_runs (run_type, started_at DESC);

ALTER TABLE public.sevdesk_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin full access to sevdesk_sync_runs" ON public.sevdesk_sync_runs;
CREATE POLICY "Allow admin full access to sevdesk_sync_runs"
  ON public.sevdesk_sync_runs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
