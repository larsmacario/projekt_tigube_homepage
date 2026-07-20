-- Impf-Erinnerungen: täglicher Aufruf der App-API über Supabase pg_cron + pg_net
-- Secrets in Supabase Vault anlegen (Dashboard → Project Settings → Vault):
--   cron_secret   = gleicher Wert wie CRON_SECRET in Vercel (für API-Auth)
--   app_base_url  = z. B. https://tierischgutbetreut.de

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_vaccination_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  cron_secret text;
  app_url text;
BEGIN
  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;

  SELECT decrypted_secret INTO app_url
  FROM vault.decrypted_secrets
  WHERE name = 'app_base_url'
  LIMIT 1;

  IF cron_secret IS NULL OR app_url IS NULL THEN
    RAISE WARNING 'Impf-Reminder übersprungen: Vault-Secrets cron_secret oder app_base_url fehlen';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := rtrim(app_url, '/') || '/api/cron/vaccination-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 120000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_vaccination_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_vaccination_reminders() TO postgres;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'vaccination-reminders-daily';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'vaccination-reminders-daily',
  '0 7 * * *',
  $$SELECT public.trigger_vaccination_reminders();$$
);
