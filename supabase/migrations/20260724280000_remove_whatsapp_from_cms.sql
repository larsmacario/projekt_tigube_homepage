-- Remove WhatsApp URLs and update contact/legal copy on public website CMS keys.

UPDATE public.cms_content
SET data = data - 'contactWhatsAppUrl'
WHERE key = 'homepage'
  AND data ? 'contactWhatsAppUrl';

UPDATE public.cms_content
SET data = (data - 'contactCtaWhatsAppUrl')
  || CASE
    WHEN data->>'contactCtaInfo' IS NOT NULL
    THEN jsonb_build_object(
      'contactCtaInfo',
      replace(data->>'contactCtaInfo', 'WhatsApp/Anruf', 'Telefon')
    )
    ELSE '{}'::jsonb
  END
WHERE key IN ('hundepension', 'katzenbetreuung')
  AND (data ? 'contactCtaWhatsAppUrl' OR (data->>'contactCtaInfo') LIKE '%WhatsApp%');

UPDATE public.cms_content
SET data = jsonb_set(
  data,
  '{content}',
  to_jsonb(
    replace(
      data->>'content',
      'Die Stornierung muss grundsätzlich in schriftlicher Form per Mail oder WhatsApp erfolgen.',
      'Die Stornierung muss grundsätzlich in schriftlicher Form per E-Mail oder über das <a href="/#kontakt">Kontaktformular auf der Startseite</a> erfolgen.'
    )
  )
)
WHERE key = 'agb'
  AND data->>'content' LIKE '%WhatsApp%';
