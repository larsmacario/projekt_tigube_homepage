-- Kundenanschrift für Portal, Vertrag und Admin-CRM
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS strasse text,
  ADD COLUMN IF NOT EXISTS hausnummer text,
  ADD COLUMN IF NOT EXISTS plz text,
  ADD COLUMN IF NOT EXISTS ort text;

COMMENT ON COLUMN public.contacts.strasse IS 'Straße (Kundenportal / Vertrag)';
COMMENT ON COLUMN public.contacts.hausnummer IS 'Hausnummer (Kundenportal / Vertrag)';
COMMENT ON COLUMN public.contacts.plz IS 'Postleitzahl (Kundenportal / Vertrag)';
COMMENT ON COLUMN public.contacts.ort IS 'Ort (Kundenportal / Vertrag)';
