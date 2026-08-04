-- Eigenständiger Zusatzleistungs-Katalog (unabhängig vom Preis-System)
CREATE TABLE IF NOT EXISTS public.addon_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_addon_services_active_sort
  ON public.addon_services (is_active, sort_order)
  WHERE is_active = true;

ALTER TABLE public.booking_line_items
  ADD COLUMN IF NOT EXISTS addon_service_id UUID REFERENCES public.addon_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_booking_line_items_addon_service_id
  ON public.booking_line_items (addon_service_id)
  WHERE addon_service_id IS NOT NULL;

ALTER TABLE public.addon_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin full access to addon_services" ON public.addon_services;
DROP POLICY IF EXISTS "Allow authenticated read active addon_services" ON public.addon_services;

CREATE POLICY "Allow admin full access to addon_services"
  ON public.addon_services
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

CREATE POLICY "Allow authenticated read active addon_services"
  ON public.addon_services
  FOR SELECT
  TO authenticated
  USING (is_active = true);
