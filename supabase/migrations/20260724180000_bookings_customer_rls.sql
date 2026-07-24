-- Kundenportal: eigene Buchungsanfragen lesen und als pending anlegen
CREATE POLICY "Allow select for owners"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT contacts.id
    FROM contacts
    WHERE contacts.user_id = auth.uid()
  )
);

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
  AND end_date >= start_date
  AND pet_id IN (
    SELECT pets.id
    FROM pets
    WHERE pets.customer_id = bookings.customer_id
  )
);
