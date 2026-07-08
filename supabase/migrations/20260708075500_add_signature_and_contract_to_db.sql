-- Add contract columns to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP WITH TIME ZONE;

-- Create signature_sessions table
CREATE TABLE IF NOT EXISTS signature_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  signature_data TEXT, -- Holds the Base64 image data of the signature
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE signature_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public access (anon & authenticated) by session ID for seamless QR-code mobile signature
DROP POLICY IF EXISTS "Allow public insert to signature_sessions" ON signature_sessions;
CREATE POLICY "Allow public insert to signature_sessions" 
  ON signature_sessions FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select to signature_sessions" ON signature_sessions;
CREATE POLICY "Allow public select to signature_sessions" 
  ON signature_sessions FOR SELECT 
  TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Allow public update to signature_sessions" ON signature_sessions;
CREATE POLICY "Allow public update to signature_sessions" 
  ON signature_sessions FOR UPDATE 
  TO anon, authenticated 
  USING (true)
  WITH CHECK (true);
