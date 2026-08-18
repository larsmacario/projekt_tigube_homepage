-- AGB CMS: Tierbesitzer → Tierhalter im Betreuungsvertrag (HTML-Inhalt)
UPDATE public.cms_content
SET data = jsonb_set(
  data,
  '{content}',
  to_jsonb(
    replace(
      replace(coalesce(data->>'content', ''), 'Tierbesitzers', 'Tierhalters'),
      'Tierbesitzer',
      'Tierhalter'
    )
  )
)
WHERE key = 'agb'
  AND (
    coalesce(data->>'content', '') LIKE '%Tierbesitzer%'
    OR coalesce(data->>'content', '') LIKE '%Tierbesitzers%'
  );
