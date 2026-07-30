-- Wartelisten-Einträge als contact_type 'waitlist' erlauben

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_contact_type_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_contact_type_check
  CHECK (contact_type = ANY (ARRAY['lead'::text, 'customer'::text, 'lost'::text, 'waitlist'::text]));
