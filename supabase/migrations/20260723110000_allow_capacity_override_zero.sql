-- Kapazität 0 erlaubt explizite Schließtage in capacity_overrides
ALTER TABLE capacity_overrides
  DROP CONSTRAINT IF EXISTS capacity_overrides_capacity_check;

ALTER TABLE capacity_overrides
  ADD CONSTRAINT capacity_overrides_capacity_check CHECK (capacity >= 0);

COMMENT ON COLUMN capacity_overrides.capacity IS 'Tageskapazität; 0 = geschlossen';
