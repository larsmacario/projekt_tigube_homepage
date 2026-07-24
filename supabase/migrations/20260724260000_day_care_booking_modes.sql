-- Tagesbetreuung: einmalig (selected_dates) vs. feste Wochentage (recurring, ohne Enddatum)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS day_care_mode TEXT
    CHECK (day_care_mode IS NULL OR day_care_mode IN ('once', 'recurring')),
  ADD COLUMN IF NOT EXISTS day_care_weekdays SMALLINT[],
  ADD COLUMN IF NOT EXISTS selected_dates DATE[];

ALTER TABLE public.bookings
  ALTER COLUMN end_date DROP NOT NULL;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_day_care_end_date_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_day_care_end_date_check CHECK (
    (end_date IS NOT NULL AND end_date >= start_date)
    OR (
      end_date IS NULL
      AND service_type = 'tagesbetreuung'
      AND day_care_mode = 'recurring'
    )
  );

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_day_care_fields_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_day_care_fields_check CHECK (
    service_type <> 'tagesbetreuung'
    OR (
      day_care_mode = 'once'
      AND selected_dates IS NOT NULL
      AND cardinality(selected_dates) > 0
      AND day_care_weekdays IS NULL
    )
    OR (
      day_care_mode = 'recurring'
      AND day_care_weekdays IS NOT NULL
      AND cardinality(day_care_weekdays) > 0
      AND selected_dates IS NULL
    )
  );

DROP POLICY IF EXISTS "Allow insert for owners" ON public.bookings;

CREATE POLICY "Allow insert for owners"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT contacts.id
    FROM contacts
    WHERE contacts.user_id = auth.uid()
  )
  AND status = 'pending'
  AND responded_at IS NULL
  AND responded_by IS NULL
  AND admin_notes IS NULL
  AND service_type IN ('hundepension', 'katzenbetreuung', 'tagesbetreuung')
  AND (end_date IS NULL OR end_date >= start_date)
  AND pet_id IN (
    SELECT pets.id
    FROM pets
    WHERE pets.customer_id = bookings.customer_id
  )
);
