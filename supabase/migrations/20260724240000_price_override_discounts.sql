-- Optional Sonderpreis + Rabatt auf Kunden- und Gruppen-Overrides
-- Entfernt Kategorie „Hundepension Rabatte“ inkl. Katalogposten

ALTER TABLE customer_prices
  ALTER COLUMN price DROP NOT NULL;

ALTER TABLE group_prices
  ALTER COLUMN price DROP NOT NULL;

ALTER TABLE customer_prices
  DROP CONSTRAINT IF EXISTS customer_prices_price_check;

ALTER TABLE group_prices
  DROP CONSTRAINT IF EXISTS group_prices_price_check;

ALTER TABLE customer_prices
  ADD CONSTRAINT customer_prices_price_check CHECK (price IS NULL OR price >= 0);

ALTER TABLE group_prices
  ADD CONSTRAINT group_prices_price_check CHECK (price IS NULL OR price >= 0);

ALTER TABLE customer_prices
  ADD COLUMN IF NOT EXISTS discount_type TEXT,
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC;

ALTER TABLE group_prices
  ADD COLUMN IF NOT EXISTS discount_type TEXT,
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC;

ALTER TABLE customer_prices
  DROP CONSTRAINT IF EXISTS customer_prices_discount_type_check;

ALTER TABLE group_prices
  DROP CONSTRAINT IF EXISTS group_prices_discount_type_check;

ALTER TABLE customer_prices
  ADD CONSTRAINT customer_prices_discount_type_check
  CHECK (discount_type IS NULL OR discount_type IN ('fixed', 'percentage'));

ALTER TABLE group_prices
  ADD CONSTRAINT group_prices_discount_type_check
  CHECK (discount_type IS NULL OR discount_type IN ('fixed', 'percentage'));

ALTER TABLE customer_prices
  DROP CONSTRAINT IF EXISTS customer_prices_discount_value_check;

ALTER TABLE group_prices
  DROP CONSTRAINT IF EXISTS group_prices_discount_value_check;

ALTER TABLE customer_prices
  ADD CONSTRAINT customer_prices_discount_value_check
  CHECK (discount_value IS NULL OR discount_value >= 0);

ALTER TABLE group_prices
  ADD CONSTRAINT group_prices_discount_value_check
  CHECK (discount_value IS NULL OR discount_value >= 0);

ALTER TABLE customer_prices
  DROP CONSTRAINT IF EXISTS customer_prices_discount_pair_check;

ALTER TABLE group_prices
  DROP CONSTRAINT IF EXISTS group_prices_discount_pair_check;

ALTER TABLE customer_prices
  ADD CONSTRAINT customer_prices_discount_pair_check CHECK (
    (discount_type IS NULL AND discount_value IS NULL)
    OR (discount_type IS NOT NULL AND discount_value IS NOT NULL)
  );

ALTER TABLE group_prices
  ADD CONSTRAINT group_prices_discount_pair_check CHECK (
    (discount_type IS NULL AND discount_value IS NULL)
    OR (discount_type IS NOT NULL AND discount_value IS NOT NULL)
  );

ALTER TABLE customer_prices
  DROP CONSTRAINT IF EXISTS customer_prices_override_has_value_check;

ALTER TABLE group_prices
  DROP CONSTRAINT IF EXISTS group_prices_override_has_value_check;

ALTER TABLE customer_prices
  ADD CONSTRAINT customer_prices_override_has_value_check CHECK (
    price IS NOT NULL
    OR (discount_type IS NOT NULL AND discount_value IS NOT NULL)
  );

ALTER TABLE group_prices
  ADD CONSTRAINT group_prices_override_has_value_check CHECK (
    price IS NOT NULL
    OR (discount_type IS NOT NULL AND discount_value IS NOT NULL)
  );

-- Kategorie Hundepension Rabatte (Preise per CASCADE)
DELETE FROM price_categories
WHERE id = 'd4444444-4444-4444-d444-444444444444';
