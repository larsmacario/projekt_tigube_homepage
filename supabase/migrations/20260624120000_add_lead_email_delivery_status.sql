ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS email_internal_status text,
  ADD COLUMN IF NOT EXISTS email_internal_error text,
  ADD COLUMN IF NOT EXISTS email_confirmation_status text,
  ADD COLUMN IF NOT EXISTS email_confirmation_error text;

COMMENT ON COLUMN public.contacts.email_internal_status IS 'SMTP-Versandstatus der internen Lead-Benachrichtigung: sent oder failed';
COMMENT ON COLUMN public.contacts.email_internal_error IS 'Fehlergrund der internen SMTP-Benachrichtigung';
COMMENT ON COLUMN public.contacts.email_confirmation_status IS 'SMTP-Versandstatus der Eingangsbestätigung an den Lead: sent oder failed';
COMMENT ON COLUMN public.contacts.email_confirmation_error IS 'Fehlergrund der SMTP-Eingangsbestätigung';
