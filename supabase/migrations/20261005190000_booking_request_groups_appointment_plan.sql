ALTER TABLE booking_request_groups
  ADD COLUMN IF NOT EXISTS appointment_plan JSONB;

COMMENT ON COLUMN booking_request_groups.appointment_plan IS
  'Versionierter Terminplan (Urlaubsblöcke, Tagesbetreuungszeiten, ausgelassene Serientermine).';
