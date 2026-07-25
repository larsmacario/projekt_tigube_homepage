-- Bring-/Holzeiten pro Wizard-Anfrage (request_group_id)
CREATE TABLE IF NOT EXISTS public.booking_request_groups (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  drop_off_time TEXT,
  pick_up_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_request_groups_drop_off_time_check CHECK (
    drop_off_time IS NULL OR drop_off_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  CONSTRAINT booking_request_groups_pick_up_time_check CHECK (
    pick_up_time IS NULL OR pick_up_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  )
);

CREATE INDEX IF NOT EXISTS idx_booking_request_groups_customer_id
  ON public.booking_request_groups (customer_id);

ALTER TABLE public.booking_request_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage booking request groups"
ON public.booking_request_groups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

CREATE POLICY "Customers read own booking request groups"
ON public.booking_request_groups
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM public.contacts c WHERE c.user_id = auth.uid()
  )
);
