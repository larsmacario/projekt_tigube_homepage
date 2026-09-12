-- Konto-Löschung: Anonymisierungs-Metadaten auf contacts + Audit-Log

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_retention_until date;

COMMENT ON COLUMN public.contacts.deleted_at IS 'Zeitpunkt der Konto-Löschung durch Kunde oder Admin';
COMMENT ON COLUMN public.contacts.anonymized_at IS 'Zeitpunkt der Anonymisierung personenbezogener Felder';
COMMENT ON COLUMN public.contacts.deletion_retention_until IS 'Ende der gesetzlichen Aufbewahrungsfrist (Rechnung/Vertrag)';

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_status_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_status_check
  CHECK (
    status IS NULL
    OR status = ANY (ARRAY['new'::text, 'contacted'::text, 'pending'::text, 'active'::text, 'deleted'::text])
  );

CREATE TABLE IF NOT EXISTS public.customer_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  kundennummer text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz NOT NULL DEFAULT now(),
  retention_until date,
  retention_reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by text NOT NULL,
  deletion_mode text NOT NULL CHECK (deletion_mode IN ('full', 'anonymized'))
);

CREATE INDEX IF NOT EXISTS customer_deletion_log_customer_id_idx
  ON public.customer_deletion_log (customer_id);

CREATE INDEX IF NOT EXISTS customer_deletion_log_executed_at_idx
  ON public.customer_deletion_log (executed_at DESC);

ALTER TABLE public.customer_deletion_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_deletion_log FROM anon, authenticated;

COMMENT ON TABLE public.customer_deletion_log IS 'Audit-Log für Konto-Löschungen (ohne FK auf contacts, bleibt nach Purge erhalten)';
