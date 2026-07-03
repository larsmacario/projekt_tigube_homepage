-- Create price_categories table
CREATE TABLE IF NOT EXISTS price_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('hundepension', 'katzenbetreuung', 'all')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial price categories with specific UUIDs
INSERT INTO price_categories (id, name, description, service_type, sort_order)
VALUES
  ('a1111111-1111-4111-a111-111111111111', 'Kennenlernen', 'Erstgespräch und Probetage für Hund und Katz', 'all', 1),
  ('b2222222-2222-4222-b222-222222222222', 'Hundepension Grundpreise', 'Grundpreise pro Kalendertag für die Pension', 'hundepension', 2),
  ('c3333333-3333-4333-c333-333333333333', 'Hundepension Zusatzleistungen', 'Optionale Zusatzleistungen für Hunde', 'hundepension', 3),
  ('d4444444-4444-4444-d444-444444444444', 'Hundepension Rabatte', 'Mengen- und Langzeitrabatte', 'hundepension', 4),
  ('e5555555-5555-4555-e555-555555555555', 'Hundepension Bring- und Holzeiten', 'Zeiten für Bringen und Abholen', 'hundepension', 5),
  ('f6666666-6666-4666-f666-666666666666', 'Hundepension Langzeit-Betreuung', 'Für Aufenthalte ab 4 Wochen', 'hundepension', 6),
  ('77777777-7777-4777-8777-777777777777', 'Hundepension Wichtiger Hinweis', 'Allgemeine Hinweise zur Hundepension', 'hundepension', 7),
  ('88888888-8888-4888-9888-888888888888', 'Katzenbetreuung Grundpreise', 'Preise pro Besuch vor Ort', 'katzenbetreuung', 8),
  ('99999999-9999-4999-a999-999999999999', 'Katzenbetreuung Zusatzleistungen', 'Optionale Zusatzleistungen für Katzen', 'katzenbetreuung', 9),
  ('aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa', 'Katzenbetreuung Wichtige Hinweise', 'Allgemeine Hinweise zur Katzenbetreuung', 'katzenbetreuung', 10)
ON CONFLICT (id) DO NOTHING;

-- Add category_id to prices table
ALTER TABLE prices 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES price_categories(id) ON DELETE CASCADE;

-- Map existing prices to the new category_id
UPDATE prices SET category_id = 'a1111111-1111-4111-a111-111111111111' WHERE category = 'kennenlernen';
UPDATE prices SET category_id = 'b2222222-2222-4222-b222-222222222222' WHERE category = 'grundpreise';
UPDATE prices SET category_id = 'c3333333-3333-4333-c333-333333333333' WHERE category = 'zusatzleistungen';
UPDATE prices SET category_id = 'd4444444-4444-4444-d444-444444444444' WHERE category = 'rabatte';
UPDATE prices SET category_id = 'e5555555-5555-4555-e555-555555555555' WHERE category = 'zeiten';
UPDATE prices SET category_id = 'f6666666-6666-4666-f666-666666666666' WHERE category = 'langzeit';
UPDATE prices SET category_id = '77777777-7777-4777-8777-777777777777' WHERE category = 'hinweis';

-- Fallback for any unmapped prices (just in case)
UPDATE prices SET category_id = 'b2222222-2222-4222-b222-222222222222' WHERE category_id IS NULL;

-- Set category_id to NOT NULL
ALTER TABLE prices ALTER COLUMN category_id SET NOT NULL;

-- Drop old category column
ALTER TABLE prices DROP COLUMN IF EXISTS category;

-- Seed Katzenbetreuung prices into prices table
INSERT INTO prices (name, description, price, price_type, unit, sort_order, category_id)
VALUES
  ('Katze Erstgespräch', 'Erstgespräch ca. 30 Minuten vor Ort', 25.00, 'fixed', 'einmalig', 1, '88888888-8888-4888-9888-888888888888'),
  ('1 Besuch pro Tag', 'Besuch ca. 30 Minuten vor Ort', 14.50, 'per_unit', 'pro Besuch', 2, '88888888-8888-4888-9888-888888888888'),
  ('2 Besuche pro Tag', 'Zwei Besuche ca. 30 Minuten vor Ort', 12.50, 'per_unit', 'pro Besuch', 3, '88888888-8888-4888-9888-888888888888'),
  ('Streu komplett tauschen', 'Kompletter Austausch des Katzenstreus', 10.00, 'fixed', 'pauschal', 1, '99999999-9999-4999-a999-999999999999'),
  ('Medikamentengabe', 'Medikamentengabe (nur bei zutraulichen Katzen)', 1.50, 'per_unit', 'je Gabe', 2, '99999999-9999-4999-a999-999999999999'),
  ('Schlüssel holen/bringen', 'Schlüsselabholung oder -rückgabe', 5.00, 'fixed', 'je holen und bringen', 3, '99999999-9999-4999-a999-999999999999'),
  ('Fahrtkosten', 'Fahrtkosten für An- und Abfahrt', 0.55, 'per_unit', 'pro km', 4, '99999999-9999-4999-a999-999999999999'),
  ('Sonn- und Feiertagszuschlag', 'Zuschlag auf den vereinbarten Tagespreis', 50.00, 'percentage', 'auf den Tagespreis', 5, '99999999-9999-4999-a999-999999999999')
ON CONFLICT DO NOTHING;

-- Enable RLS for price_categories
ALTER TABLE price_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent errors
DROP POLICY IF EXISTS "Allow admin full access to price_categories" ON price_categories;
DROP POLICY IF EXISTS "Allow public read to price_categories" ON price_categories;

-- Create Policies for price_categories
CREATE POLICY "Allow admin full access to price_categories" 
  ON price_categories FOR ALL 
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

CREATE POLICY "Allow public read to price_categories" 
  ON price_categories FOR SELECT 
  USING (true);
