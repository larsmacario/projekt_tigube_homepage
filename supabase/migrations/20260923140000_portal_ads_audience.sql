-- Zielgruppe für Portal-Werbeanzeigen (Hund / Katze / alle Kunden)

ALTER TABLE public.portal_ads
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all'
  CHECK (audience IN ('all', 'dog', 'cat'));

COMMENT ON COLUMN public.portal_ads.audience IS
  'Zielgruppe: all = alle Kunden, dog = mindestens ein lebender Hund, cat = mindestens eine lebende Katze';
