-- Create customer_groups table
CREATE TABLE IF NOT EXISTS customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add customer_group_id to contacts
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS customer_group_id UUID REFERENCES customer_groups(id) ON DELETE SET NULL;

-- Create group_prices table
CREATE TABLE IF NOT EXISTS group_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES customer_groups(id) ON DELETE CASCADE,
  price_id UUID NOT NULL REFERENCES prices(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_id, price_id)
);

-- Create customer_prices table
CREATE TABLE IF NOT EXISTS customer_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  price_id UUID NOT NULL REFERENCES prices(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(customer_id, price_id)
);

-- Enable RLS
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_prices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent errors
DROP POLICY IF EXISTS "Allow admin full access to customer_groups" ON customer_groups;
DROP POLICY IF EXISTS "Allow public read to customer_groups" ON customer_groups;
DROP POLICY IF EXISTS "Allow admin full access to group_prices" ON group_prices;
DROP POLICY IF EXISTS "Allow customers to read their group prices" ON group_prices;
DROP POLICY IF EXISTS "Allow admin full access to customer_prices" ON customer_prices;
DROP POLICY IF EXISTS "Allow customers to read their customer prices" ON customer_prices;

-- Create Policies

-- customer_groups
CREATE POLICY "Allow admin full access to customer_groups" 
  ON customer_groups FOR ALL 
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

CREATE POLICY "Allow public read to customer_groups" 
  ON customer_groups FOR SELECT 
  USING (true);

-- group_prices
CREATE POLICY "Allow admin full access to group_prices" 
  ON group_prices FOR ALL 
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

CREATE POLICY "Allow customers to read their group prices" 
  ON group_prices FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM contacts 
      WHERE contacts.user_id = auth.uid() AND contacts.customer_group_id = group_prices.group_id
    )
  );

-- customer_prices
CREATE POLICY "Allow admin full access to customer_prices" 
  ON customer_prices FOR ALL 
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

CREATE POLICY "Allow customers to read their customer prices" 
  ON customer_prices FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM contacts 
      WHERE contacts.user_id = auth.uid() AND contacts.id = customer_prices.customer_id
    )
  );
