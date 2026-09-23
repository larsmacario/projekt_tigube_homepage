ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS sevdesk_tags text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.contacts.sevdesk_tags IS
  'Normalisierte SevDesk-Kontakt-Tags (lowercase), z. B. aktiv, cat';
