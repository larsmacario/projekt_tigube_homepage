ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS contract_email_status text,
  ADD COLUMN IF NOT EXISTS contract_email_error text,
  ADD COLUMN IF NOT EXISTS contract_email_sent_at timestamp with time zone;

COMMENT ON COLUMN public.contacts.contract_email_status IS 'SMTP-Versandstatus der Vertrags-Mail nach Onboarding: sent oder failed';
COMMENT ON COLUMN public.contacts.contract_email_error IS 'Fehlergrund beim Versand der Vertrags-Mail';
COMMENT ON COLUMN public.contacts.contract_email_sent_at IS 'Zeitpunkt des letzten erfolgreichen Vertrags-Mail-Versands';
