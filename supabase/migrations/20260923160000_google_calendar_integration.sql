-- Google Calendar: OAuth-Geheimnisse im Vault, Metadaten in google_calendar_settings

CREATE TABLE IF NOT EXISTS public.google_calendar_settings (
  id TEXT PRIMARY KEY DEFAULT 'google_calendar' CHECK (id = 'google_calendar'),
  client_id TEXT,
  oauth_configured BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  calendar_id TEXT,
  calendar_summary TEXT,
  blocking_enabled BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
  last_freebusy_at TIMESTAMPTZ,
  last_freebusy_ok BOOLEAN,
  last_freebusy_error TEXT,
  connected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.google_calendar_settings (id)
VALUES ('google_calendar')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.google_calendar_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin full access to google_calendar_settings" ON public.google_calendar_settings;

CREATE POLICY "Allow admin full access to google_calendar_settings"
  ON public.google_calendar_settings
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

CREATE OR REPLACE FUNCTION public.google_calendar_set_oauth_credentials(
  p_client_id text,
  p_client_secret text,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  secret_id uuid;
  trimmed_id text;
  trimmed_secret text;
BEGIN
  trimmed_id := trim(p_client_id);
  trimmed_secret := trim(p_client_secret);

  IF trimmed_id IS NULL OR length(trimmed_id) < 10 THEN
    RAISE EXCEPTION 'Ungültige Google OAuth Client-ID';
  END IF;

  IF trimmed_secret IS NULL OR length(trimmed_secret) < 10 THEN
    RAISE EXCEPTION 'Ungültiges Google OAuth Client-Geheimnis';
  END IF;

  SELECT id INTO secret_id
  FROM vault.secrets
  WHERE name = 'google_calendar_oauth_client_secret'
  LIMIT 1;

  IF secret_id IS NULL THEN
    PERFORM vault.create_secret(
      trimmed_secret,
      'google_calendar_oauth_client_secret',
      'Google Calendar OAuth client secret'
    );
  ELSE
    PERFORM vault.update_secret(
      secret_id,
      trimmed_secret,
      'google_calendar_oauth_client_secret',
      'Google Calendar OAuth client secret'
    );
  END IF;

  INSERT INTO public.google_calendar_settings (
    id,
    client_id,
    oauth_configured,
    updated_at
  )
  VALUES (
    'google_calendar',
    trimmed_id,
    true,
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    client_id = EXCLUDED.client_id,
    oauth_configured = true,
    updated_at = timezone('utc'::text, now());
END;
$$;

CREATE OR REPLACE FUNCTION public.google_calendar_set_refresh_token(
  p_refresh_token text,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  secret_id uuid;
  trimmed_token text;
BEGIN
  trimmed_token := trim(p_refresh_token);

  IF trimmed_token IS NULL OR length(trimmed_token) < 10 THEN
    RAISE EXCEPTION 'Ungültiger Google Refresh Token';
  END IF;

  SELECT id INTO secret_id
  FROM vault.secrets
  WHERE name = 'google_calendar_oauth_refresh_token'
  LIMIT 1;

  IF secret_id IS NULL THEN
    PERFORM vault.create_secret(
      trimmed_token,
      'google_calendar_oauth_refresh_token',
      'Google Calendar OAuth refresh token'
    );
  ELSE
    PERFORM vault.update_secret(
      secret_id,
      trimmed_token,
      'google_calendar_oauth_refresh_token',
      'Google Calendar OAuth refresh token'
    );
  END IF;

  UPDATE public.google_calendar_settings
  SET
    is_connected = true,
    connected_by = p_admin_id,
    connected_at = COALESCE(connected_at, timezone('utc'::text, now())),
    updated_at = timezone('utc'::text, now())
  WHERE id = 'google_calendar';
END;
$$;

CREATE OR REPLACE FUNCTION public.google_calendar_get_oauth_client_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  client_secret text;
BEGIN
  SELECT decrypted_secret INTO client_secret
  FROM vault.decrypted_secrets
  WHERE name = 'google_calendar_oauth_client_secret'
  LIMIT 1;

  RETURN client_secret;
END;
$$;

CREATE OR REPLACE FUNCTION public.google_calendar_get_refresh_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  refresh_token text;
BEGIN
  SELECT decrypted_secret INTO refresh_token
  FROM vault.decrypted_secrets
  WHERE name = 'google_calendar_oauth_refresh_token'
  LIMIT 1;

  RETURN refresh_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.google_calendar_clear_connection()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  DELETE FROM vault.secrets
  WHERE name IN (
    'google_calendar_oauth_client_secret',
    'google_calendar_oauth_refresh_token'
  );

  UPDATE public.google_calendar_settings
  SET
    client_id = NULL,
    oauth_configured = false,
    is_connected = false,
    calendar_id = NULL,
    calendar_summary = NULL,
    blocking_enabled = false,
    last_freebusy_at = NULL,
    last_freebusy_ok = NULL,
    last_freebusy_error = NULL,
    connected_by = NULL,
    connected_at = NULL,
    updated_at = timezone('utc'::text, now())
  WHERE id = 'google_calendar';
END;
$$;

REVOKE ALL ON FUNCTION public.google_calendar_set_oauth_credentials(text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.google_calendar_set_refresh_token(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.google_calendar_get_oauth_client_secret() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.google_calendar_get_refresh_token() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.google_calendar_clear_connection() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.google_calendar_set_oauth_credentials(text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.google_calendar_set_refresh_token(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.google_calendar_get_oauth_client_secret() TO service_role;
GRANT EXECUTE ON FUNCTION public.google_calendar_get_refresh_token() TO service_role;
GRANT EXECUTE ON FUNCTION public.google_calendar_clear_connection() TO service_role;
