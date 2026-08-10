-- Verstorben-Status: Soft-Archivierung statt Hard-Delete
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS deceased_at date;

COMMENT ON COLUMN pets.deceased_at IS 'Datum, an dem das Tier verstorben ist bzw. nicht mehr lebt';

CREATE INDEX IF NOT EXISTS idx_pets_deceased_at
  ON pets (deceased_at)
  WHERE deceased_at IS NOT NULL;
