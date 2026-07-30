-- Globaler Wartelisten-Modus für unverbindliche Anfragen

CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'site' CHECK (id = 'site'),
  waitlist_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.site_settings (id)
VALUES ('site')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow admin full access to site_settings" ON public.site_settings;

CREATE POLICY "Allow public read access to site_settings"
  ON public.site_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to site_settings"
  ON public.site_settings
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

INSERT INTO public.cms_content (key, data)
VALUES (
  'waitlist',
  '{
    "formTitle": "Warteliste für Kennenlernen",
    "formHint": "Aktuell ist ein Kennenlernen nur über unsere Warteliste möglich. Tragen Sie sich ein – wir melden uns, sobald ein Platz frei wird.",
    "formDescription": "Ihre Angaben helfen uns, Sie passend einzuplanen, sobald wieder Kapazität für ein Kennenlernen frei ist.",
    "successMessage": "Vielen Dank! Sie stehen auf unserer Warteliste. Wir melden uns bei Ihnen, sobald ein Kennenlerntermin möglich ist.",
    "emailSubject": "Deine Wartelisten-Anmeldung bei tierisch gut betreut GmbH",
    "emailIntro": "vielen Dank für deine Anmeldung auf unsere Warteliste. Aktuell ist ein Kennenlernen nur über die Warteliste möglich. Wir haben deine Angaben erhalten und melden uns bei dir, sobald ein Platz frei wird."
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
