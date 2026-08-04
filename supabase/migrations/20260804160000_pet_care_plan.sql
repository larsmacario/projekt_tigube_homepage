-- Strukturierter Futter-/Medikamentenplan pro Tier
ALTER TABLE pets ADD COLUMN IF NOT EXISTS care_plan JSONB;

COMMENT ON COLUMN pets.care_plan IS 'Strukturierter Futter- und Medikamentenplan (JSON)';

CREATE TABLE IF NOT EXISTS pet_care_plan_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pet_care_plan_changes_unseen
  ON pet_care_plan_changes (changed_at DESC)
  WHERE seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pet_care_plan_changes_pet
  ON pet_care_plan_changes (pet_id, changed_at DESC);

ALTER TABLE pet_care_plan_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY pet_care_plan_changes_admin_select
  ON pet_care_plan_changes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY pet_care_plan_changes_admin_update
  ON pet_care_plan_changes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );
