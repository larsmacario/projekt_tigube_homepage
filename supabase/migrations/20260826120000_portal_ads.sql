-- Portal-Werbebanner: Formate, Anzeigen und Rotations-Einstellungen

CREATE TABLE IF NOT EXISTS public.ad_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  width_px INTEGER NOT NULL CHECK (width_px > 0),
  height_px INTEGER NOT NULL CHECK (height_px > 0),
  placement TEXT NOT NULL DEFAULT 'sidebar' CHECK (placement IN ('sidebar')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.portal_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format_id UUID NOT NULL REFERENCES public.ad_formats(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  link_target TEXT NOT NULL DEFAULT '_blank' CHECK (link_target IN ('_self', '_blank')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT portal_ads_schedule_check CHECK (
    starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at
  )
);

CREATE TABLE IF NOT EXISTS public.ad_rotation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interval_seconds INTEGER NOT NULL DEFAULT 8 CHECK (interval_seconds >= 3 AND interval_seconds <= 60),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ad_formats_active_sort
  ON public.ad_formats (is_active, sort_order)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_portal_ads_active_sort
  ON public.portal_ads (is_active, sort_order)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_portal_ads_format_id
  ON public.portal_ads (format_id);

CREATE INDEX IF NOT EXISTS idx_portal_ads_schedule
  ON public.portal_ads (starts_at, ends_at)
  WHERE is_active = true;

-- Seed: Standard-Sidebar-Format und Rotations-Einstellungen
INSERT INTO public.ad_formats (name, slug, width_px, height_px, placement, is_active, sort_order)
VALUES ('Sidebar', 'sidebar', 280, 140, 'sidebar', true, 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.ad_rotation_settings (interval_seconds, is_enabled)
SELECT 8, true
WHERE NOT EXISTS (SELECT 1 FROM public.ad_rotation_settings);

-- RLS
ALTER TABLE public.ad_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_rotation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read active ad_formats" ON public.ad_formats;
DROP POLICY IF EXISTS "Allow admin full access to ad_formats" ON public.ad_formats;
DROP POLICY IF EXISTS "Allow public read active portal_ads" ON public.portal_ads;
DROP POLICY IF EXISTS "Allow admin full access to portal_ads" ON public.portal_ads;
DROP POLICY IF EXISTS "Allow public read ad_rotation_settings" ON public.ad_rotation_settings;
DROP POLICY IF EXISTS "Allow admin full access to ad_rotation_settings" ON public.ad_rotation_settings;

CREATE POLICY "Allow public read active ad_formats"
  ON public.ad_formats
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Allow admin full access to ad_formats"
  ON public.ad_formats
  FOR ALL
  TO authenticated
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

CREATE POLICY "Allow public read active portal_ads"
  ON public.portal_ads
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Allow admin full access to portal_ads"
  ON public.portal_ads
  FOR ALL
  TO authenticated
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

CREATE POLICY "Allow public read ad_rotation_settings"
  ON public.ad_rotation_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to ad_rotation_settings"
  ON public.ad_rotation_settings
  FOR ALL
  TO authenticated
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
