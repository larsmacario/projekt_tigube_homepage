-- Auto-open Betriebsferien dialog (configurable delay, once per session on client)
ALTER TABLE newsbar_settings
  ADD COLUMN IF NOT EXISTS auto_open_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_open_delay_seconds integer NOT NULL DEFAULT 10;

ALTER TABLE newsbar_settings
  DROP CONSTRAINT IF EXISTS newsbar_settings_auto_open_delay_seconds_check;

ALTER TABLE newsbar_settings
  ADD CONSTRAINT newsbar_settings_auto_open_delay_seconds_check
  CHECK (auto_open_delay_seconds >= 0 AND auto_open_delay_seconds <= 120);

COMMENT ON COLUMN newsbar_settings.auto_open_enabled IS 'Dialog automatisch nach Verzögerung öffnen (einmal pro Browser-Sitzung)';
COMMENT ON COLUMN newsbar_settings.auto_open_delay_seconds IS 'Verzögerung in Sekunden bis zum Auto-Popup (0–120)';
