-- Onboarding-Einladungs-Mail: Versandstatus am Kunden

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS onboarding_email_status text,
  ADD COLUMN IF NOT EXISTS onboarding_email_error text,
  ADD COLUMN IF NOT EXISTS onboarding_email_sent_at timestamptz;

COMMENT ON COLUMN public.contacts.onboarding_email_status IS 'SMTP-Versandstatus der Onboarding-Einladung: sent oder failed';
COMMENT ON COLUMN public.contacts.onboarding_email_error IS 'Fehlermeldung beim Versand der Onboarding-Einladung';
COMMENT ON COLUMN public.contacts.onboarding_email_sent_at IS 'Zeitpunkt des letzten erfolgreichen Onboarding-Mail-Versands';
