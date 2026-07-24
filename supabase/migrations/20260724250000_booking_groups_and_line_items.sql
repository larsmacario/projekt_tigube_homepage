-- Gruppierte Portal-Anfragen (mehrere Tiere, ein Zeitraum)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS request_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_bookings_request_group_id
  ON public.bookings (request_group_id)
  WHERE request_group_id IS NOT NULL;

-- Optional: SevDesk-Artikelreferenz (spätere API-Anbindung)
ALTER TABLE public.prices
  ADD COLUMN IF NOT EXISTS sevdesk_article_id TEXT;

CREATE TABLE IF NOT EXISTS public.booking_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_group_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  price_id UUID REFERENCES public.prices(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  description TEXT,
  price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'percentage', 'per_unit', 'text')),
  unit TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC,
  line_total NUMERIC,
  source TEXT NOT NULL CHECK (source IN ('customer', 'admin')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_booking_line_items_request_group_id
  ON public.booking_line_items (request_group_id);

CREATE INDEX IF NOT EXISTS idx_booking_line_items_booking_id
  ON public.booking_line_items (booking_id)
  WHERE booking_id IS NOT NULL;

ALTER TABLE public.booking_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin full access to booking_line_items" ON public.booking_line_items;
DROP POLICY IF EXISTS "Allow select for booking owners" ON public.booking_line_items;

CREATE POLICY "Allow admin full access to booking_line_items"
  ON public.booking_line_items
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

CREATE POLICY "Allow select for booking owners"
  ON public.booking_line_items
  FOR SELECT
  TO authenticated
  USING (
    request_group_id IN (
      SELECT b.request_group_id
      FROM public.bookings b
      INNER JOIN public.contacts c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
        AND b.request_group_id IS NOT NULL
    )
  );
