ALTER TABLE pet_care_plan_changes
  ADD COLUMN IF NOT EXISTS care_plan_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN pet_care_plan_changes.care_plan_snapshot IS 'Vollständiger Pflegeplan nach der Änderung (after-Snapshot)';
COMMENT ON COLUMN pet_care_plan_changes.archived_at IS 'Manuell archivierte Version; NULL = aktiv';

CREATE INDEX IF NOT EXISTS idx_pet_care_plan_changes_pet_active
  ON pet_care_plan_changes (pet_id, changed_at DESC)
  WHERE archived_at IS NULL;
