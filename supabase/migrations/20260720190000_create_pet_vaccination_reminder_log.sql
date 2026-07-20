-- Log für versendete Impf-Erinnerungen (Doppelversand verhindern)
CREATE TABLE IF NOT EXISTS pet_vaccination_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  vaccination_type TEXT NOT NULL CHECK (vaccination_type IN ('kombi', 'zwingerhusten')),
  due_date DATE NOT NULL,
  days_before INTEGER NOT NULL CHECK (days_before IN (28, 14)),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  recipient_email TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pet_vaccination_reminder_unique
  ON pet_vaccination_reminder_log (pet_id, vaccination_type, due_date, days_before);

CREATE INDEX IF NOT EXISTS idx_pet_vaccination_reminder_pet
  ON pet_vaccination_reminder_log (pet_id);

ALTER TABLE pet_vaccination_reminder_log ENABLE ROW LEVEL SECURITY;

-- Nur Service-Role / Cron schreibt und liest; keine Portal-Policies nötig
