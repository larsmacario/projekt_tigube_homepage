-- SevDesk-Integration: API-Key im Supabase Vault, Metadaten in sevdesk_settings

CREATE TABLE IF NOT EXISTS public.sevdesk_settings (
  id TEXT PRIMARY KEY DEFAULT 'sevdesk' CHECK (id = 'sevdesk'),
  is_connected BOOLEAN NOT NULL DEFAULT false,
  key_preview TEXT,
  last_tested_at TIMESTAMPTZ,
  last_test_ok BOOLEAN,
  last_test_error TEXT,
  connected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.sevdesk_settings (id)
VALUES ('sevdesk')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.sevdesk_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin full access to sevdesk_settings" ON public.sevdesk_settings;

CREATE POLICY "Allow admin full access to sevdesk_settings"
  ON public.sevdesk_settings
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

CREATE OR REPLACE FUNCTION public.sevdesk_set_api_key(p_key text, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  secret_id uuid;
  preview text;
  trimmed_key text;
BEGIN
  trimmed_key := trim(p_key);

  IF trimmed_key IS NULL OR length(trimmed_key) < 8 THEN
    RAISE EXCEPTION 'Ungültiger SevDesk API-Key';
  END IF;

  preview := '****' || right(trimmed_key, 4);

  SELECT id INTO secret_id
  FROM vault.secrets
  WHERE name = 'sevdesk_api_key'
  LIMIT 1;

  IF secret_id IS NULL THEN
    PERFORM vault.create_secret(trimmed_key, 'sevdesk_api_key', 'SevDesk REST API key');
  ELSE
    PERFORM vault.update_secret(
      secret_id,
      trimmed_key,
      'sevdesk_api_key',
      'SevDesk REST API key'
    );
  END IF;

  INSERT INTO public.sevdesk_settings (
    id,
    is_connected,
    key_preview,
    connected_by,
    connected_at,
    updated_at
  )
  VALUES (
    'sevdesk',
    true,
    preview,
    p_admin_id,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    is_connected = true,
    key_preview = EXCLUDED.key_preview,
    connected_by = EXCLUDED.connected_by,
    connected_at = COALESCE(public.sevdesk_settings.connected_at, EXCLUDED.connected_at),
    updated_at = timezone('utc'::text, now());
END;
$$;

CREATE OR REPLACE FUNCTION public.sevdesk_get_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  api_key text;
BEGIN
  SELECT decrypted_secret INTO api_key
  FROM vault.decrypted_secrets
  WHERE name = 'sevdesk_api_key'
  LIMIT 1;

  RETURN api_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.sevdesk_clear_api_key()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  DELETE FROM vault.secrets
  WHERE name = 'sevdesk_api_key';

  UPDATE public.sevdesk_settings
  SET
    is_connected = false,
    key_preview = NULL,
    last_tested_at = NULL,
    last_test_ok = NULL,
    last_test_error = NULL,
    updated_at = timezone('utc'::text, now())
  WHERE id = 'sevdesk';
END;
$$;

REVOKE ALL ON FUNCTION public.sevdesk_set_api_key(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sevdesk_get_api_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sevdesk_clear_api_key() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sevdesk_set_api_key(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sevdesk_get_api_key() TO service_role;
GRANT EXECUTE ON FUNCTION public.sevdesk_clear_api_key() TO service_role;
