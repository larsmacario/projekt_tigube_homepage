-- Öffentliche Bezeichnung: CMS-Titel agb → „AGB“ (Hub /rechtliches, Seite /agb)
UPDATE cms_content
SET data = jsonb_set(data, '{title}', '"AGB"')
WHERE key = 'agb'
  AND coalesce(data->>'title', '') IN ('Betreuungsvertrag', 'Pflegevertrag');
