-- Kunden-E-Mails sind die eindeutige Kontakt- und Portal-Anmeldung.
-- Bestehende Dubletten müssen vor der Migration bewusst bereinigt werden.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.contacts
    WHERE contact_type = 'customer'
    GROUP BY lower(btrim(email))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Doppelte Kunden-E-Mail-Adressen gefunden. Bitte vor der Migration manuell bereinigen.';
  END IF;
END
$$;

UPDATE public.contacts
SET email = lower(btrim(email))
WHERE contact_type = 'customer'
  AND email IS DISTINCT FROM lower(btrim(email));

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_customer_email_normalized_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_customer_email_normalized_check
  CHECK (contact_type <> 'customer' OR email = lower(btrim(email)));

CREATE UNIQUE INDEX IF NOT EXISTS contacts_customer_email_ci_unique
  ON public.contacts (lower(email))
  WHERE contact_type = 'customer';

CREATE TABLE IF NOT EXISTS public.customer_email_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE REFERENCES public.contacts(id) ON DELETE CASCADE,
  requested_email text NOT NULL,
  source text NOT NULL CHECK (source IN ('admin', 'customer')),
  status text NOT NULL CHECK (status IN ('awaiting_customer_confirmation', 'awaiting_auth_confirmation')),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_email_change_requests_normalized_email_check
    CHECK (requested_email = lower(btrim(requested_email)))
);

CREATE INDEX IF NOT EXISTS customer_email_change_requests_requested_email_idx
  ON public.customer_email_change_requests (lower(requested_email));

ALTER TABLE public.customer_email_change_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_email_change_requests FROM anon, authenticated;
GRANT ALL ON TABLE public.customer_email_change_requests TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_customer_email_change(
  p_customer_id uuid,
  p_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id
  INTO v_user_id
  FROM public.contacts
  WHERE id = p_customer_id
    AND contact_type = 'customer'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kunde nicht gefunden';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.customer_email_change_requests
    WHERE customer_id = p_customer_id
      AND requested_email = lower(btrim(p_email))
      AND status = 'awaiting_auth_confirmation'
  ) THEN
    RAISE EXCEPTION 'Keine passende E-Mail-Änderung gefunden';
  END IF;

  UPDATE public.contacts
  SET email = lower(btrim(p_email))
  WHERE id = p_customer_id;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.users
    SET email = lower(btrim(p_email))
    WHERE id = v_user_id;
  END IF;

  DELETE FROM public.customer_email_change_requests
  WHERE customer_id = p_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_customer_email_change(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_customer_email_change(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_customer_email_change(uuid, text) TO service_role;
