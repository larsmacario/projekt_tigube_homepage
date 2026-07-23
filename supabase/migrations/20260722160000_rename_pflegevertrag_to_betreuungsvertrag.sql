UPDATE public.cms_content
SET data = jsonb_set(data, '{title}', '"Betreuungsvertrag"')
WHERE key = 'agb'
  AND data->>'title' = 'Pflegevertrag';
