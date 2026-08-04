-- Einheitliches Preissystem: Leistungsbereiche, Katalog-Verwendung, Preisregeln

-- Leistungsbereiche (dynamisch erweiterbar)
CREATE TABLE IF NOT EXISTS service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO service_areas (id, slug, name, description, sort_order)
VALUES
  ('a1111111-1111-4111-a111-111111111111', 'hundepension', 'Hundepension', 'Betreuung in der Hundepension', 1),
  ('a2222222-2222-4222-a222-222222222222', 'katzenbetreuung', 'Katzenbetreuung', 'Betreuung bei Ihnen zu Hause', 2)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE price_categories
  ADD COLUMN IF NOT EXISTS service_area_id UUID REFERENCES service_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE price_categories
SET service_area_id = 'a1111111-1111-4111-a111-111111111111'
WHERE service_type = 'hundepension';

UPDATE price_categories
SET service_area_id = 'a2222222-2222-4222-a222-222222222222'
WHERE service_type = 'katzenbetreuung';

-- Kategorien mit service_type = all bleiben ohne service_area_id (gelten überall)

ALTER TABLE prices
  ADD COLUMN IF NOT EXISTS usage TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Verwendung aus bestehenden Daten ableiten
UPDATE prices p
SET usage = 'info'
WHERE p.price_type = 'text' AND p.usage IS NULL;

UPDATE prices p
SET usage = 'surcharge'
WHERE p.usage IS NULL
  AND (
    p.price_type = 'percentage'
    OR p.name ILIKE '%sonn%feiertag%'
    OR p.name ILIKE '%sonn-%feiertag%'
  );

UPDATE prices p
SET usage = 'base'
WHERE p.usage IS NULL
  AND EXISTS (
    SELECT 1 FROM price_categories c
    WHERE c.id = p.category_id
      AND c.name ILIKE '%grundpreis%'
  );

UPDATE prices p
SET usage = 'extra'
WHERE p.usage IS NULL
  AND EXISTS (
    SELECT 1 FROM price_categories c
    WHERE c.id = p.category_id
      AND c.name ILIKE '%zusatz%'
  );

UPDATE prices p
SET usage = 'info'
WHERE p.usage IS NULL
  AND EXISTS (
    SELECT 1 FROM price_categories c
    WHERE c.id = p.category_id
      AND (
        c.name ILIKE '%hinweis%'
        OR c.name ILIKE '%bring%hol%'
        OR c.name ILIKE '%langzeit%'
      )
  );

UPDATE prices SET usage = 'extra' WHERE usage IS NULL;

ALTER TABLE prices
  DROP CONSTRAINT IF EXISTS prices_usage_check;

ALTER TABLE prices
  ADD CONSTRAINT prices_usage_check
  CHECK (usage IN ('base', 'extra', 'surcharge', 'info'));

ALTER TABLE prices ALTER COLUMN usage SET NOT NULL;

-- Einheitliche Preisregeln (Gruppe, Kunde, Tier)
CREATE TABLE IF NOT EXISTS price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_id UUID NOT NULL REFERENCES prices(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('group', 'customer', 'pet')),
  scope_id UUID NOT NULL,
  rule_mode TEXT NOT NULL DEFAULT 'custom' CHECK (rule_mode IN ('inherit', 'custom', 'not_applicable')),
  price NUMERIC CHECK (price IS NULL OR price >= 0),
  discount_type TEXT CHECK (discount_type IS NULL OR discount_type IN ('fixed', 'percentage')),
  discount_value NUMERIC CHECK (discount_value IS NULL OR discount_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (scope_type, scope_id, price_id),
  CONSTRAINT price_rules_discount_pair_check CHECK (
    (discount_type IS NULL AND discount_value IS NULL)
    OR (discount_type IS NOT NULL AND discount_value IS NOT NULL)
  ),
  CONSTRAINT price_rules_custom_has_value_check CHECK (
    rule_mode = 'not_applicable'
    OR rule_mode = 'inherit'
    OR price IS NOT NULL
    OR (discount_type IS NOT NULL AND discount_value IS NOT NULL)
  ),
  CONSTRAINT price_rules_pet_only_inherit_modes CHECK (
    scope_type = 'pet'
    OR rule_mode = 'custom'
  )
);

CREATE INDEX IF NOT EXISTS idx_price_rules_scope ON price_rules (scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_price_rules_price_id ON price_rules (price_id);

-- Gruppen-Overrides migrieren (effektiver Festpreis bei Kombination)
INSERT INTO price_rules (price_id, scope_type, scope_id, rule_mode, price, discount_type, discount_value)
SELECT
  gp.price_id,
  'group',
  gp.group_id,
  'custom',
  CASE
    WHEN gp.price IS NOT NULL AND gp.discount_type IS NOT NULL AND gp.discount_value IS NOT NULL THEN
      CASE
        WHEN gp.discount_type = 'fixed' THEN GREATEST(0, gp.price - gp.discount_value)
        ELSE GREATEST(0, gp.price - (gp.price * gp.discount_value / 100))
      END
    ELSE gp.price
  END,
  CASE
    WHEN gp.price IS NOT NULL AND gp.discount_type IS NOT NULL AND gp.discount_value IS NOT NULL THEN NULL
    ELSE gp.discount_type
  END,
  CASE
    WHEN gp.price IS NOT NULL AND gp.discount_type IS NOT NULL AND gp.discount_value IS NOT NULL THEN NULL
    ELSE gp.discount_value
  END
FROM group_prices gp
ON CONFLICT (scope_type, scope_id, price_id) DO NOTHING;

-- Kunden-Overrides migrieren
INSERT INTO price_rules (price_id, scope_type, scope_id, rule_mode, price, discount_type, discount_value)
SELECT
  cp.price_id,
  'customer',
  cp.customer_id,
  'custom',
  CASE
    WHEN cp.price IS NOT NULL AND cp.discount_type IS NOT NULL AND cp.discount_value IS NOT NULL THEN
      CASE
        WHEN cp.discount_type = 'fixed' THEN GREATEST(0, cp.price - cp.discount_value)
        ELSE GREATEST(0, cp.price - (cp.price * cp.discount_value / 100))
      END
    ELSE cp.price
  END,
  CASE
    WHEN cp.price IS NOT NULL AND cp.discount_type IS NOT NULL AND cp.discount_value IS NOT NULL THEN NULL
    ELSE cp.discount_type
  END,
  CASE
    WHEN cp.price IS NOT NULL AND cp.discount_type IS NOT NULL AND cp.discount_value IS NOT NULL THEN NULL
    ELSE cp.discount_value
  END
FROM customer_prices cp
ON CONFLICT (scope_type, scope_id, price_id) DO NOTHING;

ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin full access to price_rules" ON price_rules;
DROP POLICY IF EXISTS "Allow admin full access to service_areas" ON service_areas;
DROP POLICY IF EXISTS "Allow public read to service_areas" ON service_areas;
DROP POLICY IF EXISTS "Allow customers to read group price rules" ON price_rules;
DROP POLICY IF EXISTS "Allow customers to read customer price rules" ON price_rules;
DROP POLICY IF EXISTS "Allow customers to read pet price rules" ON price_rules;

CREATE POLICY "Allow admin full access to price_rules"
  ON price_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Allow customers to read group price rules"
  ON price_rules FOR SELECT
  USING (
    scope_type = 'group'
    AND EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.user_id = auth.uid()
        AND contacts.customer_group_id = price_rules.scope_id
    )
  );

CREATE POLICY "Allow customers to read customer price rules"
  ON price_rules FOR SELECT
  USING (
    scope_type = 'customer'
    AND EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.user_id = auth.uid()
        AND contacts.id = price_rules.scope_id
    )
  );

CREATE POLICY "Allow customers to read pet price rules"
  ON price_rules FOR SELECT
  USING (
    scope_type = 'pet'
    AND EXISTS (
      SELECT 1 FROM pets
      JOIN contacts ON contacts.id = pets.customer_id
      WHERE pets.id = price_rules.scope_id
        AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admin full access to service_areas"
  ON service_areas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Allow public read to service_areas"
  ON service_areas FOR SELECT
  USING (archived_at IS NULL);
