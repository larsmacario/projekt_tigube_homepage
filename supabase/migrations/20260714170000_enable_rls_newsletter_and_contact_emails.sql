-- Enable RLS on newsletter and contact_emails tables (admin-only via JWT; service role bypasses RLS)

ALTER TABLE newsletter_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_send_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_emails ENABLE ROW LEVEL SECURITY;

-- newsletter_topics
DROP POLICY IF EXISTS "Allow admin full access to newsletter_topics" ON newsletter_topics;
CREATE POLICY "Allow admin full access to newsletter_topics"
  ON newsletter_topics FOR ALL
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

-- newsletter_templates
DROP POLICY IF EXISTS "Allow admin full access to newsletter_templates" ON newsletter_templates;
CREATE POLICY "Allow admin full access to newsletter_templates"
  ON newsletter_templates FOR ALL
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

-- newsletter_campaigns
DROP POLICY IF EXISTS "Allow admin full access to newsletter_campaigns" ON newsletter_campaigns;
CREATE POLICY "Allow admin full access to newsletter_campaigns"
  ON newsletter_campaigns FOR ALL
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

-- newsletter_send_logs
DROP POLICY IF EXISTS "Allow admin full access to newsletter_send_logs" ON newsletter_send_logs;
CREATE POLICY "Allow admin full access to newsletter_send_logs"
  ON newsletter_send_logs FOR ALL
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

-- contact_emails
DROP POLICY IF EXISTS "Allow admin full access to contact_emails" ON contact_emails;
CREATE POLICY "Allow admin full access to contact_emails"
  ON contact_emails FOR ALL
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
