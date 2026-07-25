-- AGB CMS: Pflegevertrag → Betreuungsvertrag in Titel und HTML-Inhalt
UPDATE public.cms_content
SET data = jsonb_set(
  jsonb_set(
    data,
    '{title}',
    to_jsonb(
      replace(
        replace(coalesce(data->>'title', ''), 'Pflegevertrags', 'Betreuungsvertrags'),
        'Pflegevertrag',
        'Betreuungsvertrag'
      )
    )
  ),
  '{content}',
  to_jsonb(
    replace(
      replace(coalesce(data->>'content', ''), 'Pflegevertrags', 'Betreuungsvertrags'),
      'Pflegevertrag',
      'Betreuungsvertrag'
    )
  )
)
WHERE key = 'agb'
  AND (
    coalesce(data->>'title', '') LIKE '%Pflegevertrag%'
    OR coalesce(data->>'content', '') LIKE '%Pflegevertrag%'
  );
