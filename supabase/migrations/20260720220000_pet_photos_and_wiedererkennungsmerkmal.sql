-- Wiedererkennungsmerkmal am Tier
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS wiedererkennungsmerkmal TEXT;

-- Tierfoto-Galerie (Metadaten; Dateien in Storage-Bucket pet-photos)
CREATE TABLE IF NOT EXISTS pet_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS pet_photos_pet_id_idx ON pet_photos(pet_id);
CREATE INDEX IF NOT EXISTS pet_photos_customer_id_idx ON pet_photos(customer_id);

ALTER TABLE pet_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin full access to pet_photos" ON pet_photos;
DROP POLICY IF EXISTS "Allow customers full access to own pet_photos" ON pet_photos;

CREATE POLICY "Allow admin full access to pet_photos"
  ON pet_photos FOR ALL
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

CREATE POLICY "Allow customers full access to own pet_photos"
  ON pet_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.user_id = auth.uid()
        AND contacts.id = pet_photos.customer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.user_id = auth.uid()
        AND contacts.id = pet_photos.customer_id
    )
  );

-- Privater Storage-Bucket für Tierfotos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-photos',
  'pet-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow admin full access to pet-photos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow customers manage own pet-photos bucket" ON storage.objects;

CREATE POLICY "Allow admin full access to pet-photos bucket"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'pet-photos'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Allow customers manage own pet-photos bucket"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'pet-photos'
    AND EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.user_id = auth.uid()
        AND (storage.foldername(name))[1] = contacts.id::text
    )
  )
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.user_id = auth.uid()
        AND (storage.foldername(name))[1] = contacts.id::text
    )
  );
