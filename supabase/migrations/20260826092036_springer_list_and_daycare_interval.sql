-- Springer-Liste, 14-Tage-Rhythmus und nachvollziehbare Teilstornos

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS day_care_interval_weeks SMALLINT;

UPDATE public.bookings
SET day_care_interval_weeks = 1
WHERE service_type = 'tagesbetreuung'
  AND day_care_mode = 'recurring'
  AND day_care_interval_weeks IS NULL;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_day_care_interval_weeks_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_day_care_interval_weeks_check CHECK (
    (day_care_mode = 'recurring' AND day_care_interval_weeks IN (1, 2))
    OR (day_care_mode IS DISTINCT FROM 'recurring' AND day_care_interval_weeks IS NULL)
  );

CREATE TABLE IF NOT EXISTS public.booking_cancellation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  cancelled_dates DATE[] NOT NULL,
  booking_total NUMERIC NOT NULL DEFAULT 0,
  cancellation_charge_amount NUMERIC NOT NULL DEFAULT 0,
  cancellation_refund_amount NUMERIC NOT NULL DEFAULT 0,
  cancellation_rule_set_id TEXT,
  cancellation_tier_label TEXT,
  cancellation_policy_snapshot JSONB,
  price_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CHECK (cardinality(cancelled_dates) > 0)
);

CREATE INDEX IF NOT EXISTS booking_cancellation_events_booking_id_idx
  ON public.booking_cancellation_events (booking_id, created_at DESC);

ALTER TABLE public.booking_cancellation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read own cancellation events" ON public.booking_cancellation_events;
CREATE POLICY "Customers can read own cancellation events"
  ON public.booking_cancellation_events FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.contacts WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Admins manage cancellation events" ON public.booking_cancellation_events;
CREATE POLICY "Admins manage cancellation events"
  ON public.booking_cancellation_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'));

CREATE TABLE IF NOT EXISTS public.springer_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  weekdays SMALLINT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (pet_id),
  CHECK (cardinality(weekdays) > 0),
  CHECK (weekdays <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::SMALLINT[])
);

CREATE INDEX IF NOT EXISTS springer_registrations_active_weekdays_idx
  ON public.springer_registrations USING GIN (weekdays)
  WHERE is_active = true;

ALTER TABLE public.springer_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers manage own springer registrations" ON public.springer_registrations;
CREATE POLICY "Customers manage own springer registrations"
  ON public.springer_registrations FOR ALL TO authenticated
  USING (customer_id IN (SELECT id FROM public.contacts WHERE user_id = (select auth.uid())))
  WITH CHECK (
    customer_id IN (SELECT id FROM public.contacts WHERE user_id = (select auth.uid()))
    AND pet_id IN (SELECT id FROM public.pets WHERE customer_id = springer_registrations.customer_id)
  );

DROP POLICY IF EXISTS "Admins manage springer registrations" ON public.springer_registrations;
CREATE POLICY "Admins manage springer registrations"
  ON public.springer_registrations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'));

CREATE TABLE IF NOT EXISTS public.springer_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.springer_registrations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  source_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  cancellation_event_id UUID REFERENCES public.booking_cancellation_events(id) ON DELETE SET NULL,
  offer_date DATE NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'responded', 'closed', 'send_failed')),
  response_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (registration_id, offer_date)
);

CREATE INDEX IF NOT EXISTS springer_offers_open_date_idx
  ON public.springer_offers (offer_date, status);

ALTER TABLE public.springer_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers read own springer offers" ON public.springer_offers;
CREATE POLICY "Customers read own springer offers"
  ON public.springer_offers FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.contacts WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Admins manage springer offers" ON public.springer_offers;
CREATE POLICY "Admins manage springer offers"
  ON public.springer_offers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'));
