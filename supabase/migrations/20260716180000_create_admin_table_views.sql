-- Gespeicherte Tabellen-Views für Admin-Spaltenlayouts
CREATE TABLE IF NOT EXISTS admin_table_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'customer')),
  scope TEXT NOT NULL CHECK (scope IN ('personal', 'global')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  config JSONB NOT NULL DEFAULT '{"columns":[]}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT admin_table_views_personal_user CHECK (
    (scope = 'personal' AND user_id IS NOT NULL) OR
    (scope = 'global' AND user_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_admin_table_views_entity_scope
  ON admin_table_views (entity_type, scope);

CREATE INDEX IF NOT EXISTS idx_admin_table_views_user
  ON admin_table_views (user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_table_views_personal_default
  ON admin_table_views (entity_type, user_id)
  WHERE scope = 'personal' AND is_default = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_table_views_global_default
  ON admin_table_views (entity_type)
  WHERE scope = 'global' AND is_default = true;

ALTER TABLE admin_table_views ENABLE ROW LEVEL SECURITY;

-- Admins lesen persönliche (eigene) und globale Views
CREATE POLICY "Admins can read table views"
  ON admin_table_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    AND (
      scope = 'global'
      OR (scope = 'personal' AND user_id = auth.uid())
    )
  );

-- Admins erstellen Views (personal nur für sich, global für alle)
CREATE POLICY "Admins can insert table views"
  ON admin_table_views FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    AND created_by = auth.uid()
    AND (
      (scope = 'personal' AND user_id = auth.uid())
      OR (scope = 'global' AND user_id IS NULL)
    )
  );

-- Admins aktualisieren eigene persönliche oder globale Views
CREATE POLICY "Admins can update table views"
  ON admin_table_views FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    AND (
      (scope = 'personal' AND user_id = auth.uid())
      OR scope = 'global'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    AND (
      (scope = 'personal' AND user_id = auth.uid())
      OR (scope = 'global' AND user_id IS NULL)
    )
  );

-- Admins löschen eigene persönliche oder globale Views
CREATE POLICY "Admins can delete table views"
  ON admin_table_views FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    AND (
      (scope = 'personal' AND user_id = auth.uid())
      OR scope = 'global'
    )
  );
