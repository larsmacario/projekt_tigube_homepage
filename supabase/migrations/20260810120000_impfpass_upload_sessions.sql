-- QR-Code-Sessions für Impfpass-Upload vom Smartphone

CREATE TABLE IF NOT EXISTS impfpass_upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS impfpass_upload_sessions_customer_id_idx
  ON impfpass_upload_sessions (customer_id);

CREATE INDEX IF NOT EXISTS impfpass_upload_sessions_pet_id_idx
  ON impfpass_upload_sessions (pet_id)
  WHERE pet_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS impfpass_upload_session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES impfpass_upload_sessions(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  page_category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS impfpass_upload_session_items_session_id_idx
  ON impfpass_upload_session_items (session_id);

ALTER TABLE impfpass_upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE impfpass_upload_session_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select impfpass_upload_sessions" ON impfpass_upload_sessions;
CREATE POLICY "Allow public select impfpass_upload_sessions"
  ON impfpass_upload_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public select impfpass_upload_session_items" ON impfpass_upload_session_items;
CREATE POLICY "Allow public select impfpass_upload_session_items"
  ON impfpass_upload_session_items FOR SELECT
  TO anon, authenticated
  USING (true);
