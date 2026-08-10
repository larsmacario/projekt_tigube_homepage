-- CMS: strukturierte Default-Uhrzeiten für Bring-/Holzeiten (Kundenportal + Hundepension)
UPDATE cms_content
SET data = data || '{
  "pickupTimeDefaults": {
    "weekdayDropOff": "07:00",
    "weekdayPickUp": "17:00",
    "weekendDropOff": "09:00",
    "weekendPickUp": "17:00"
  }
}'::jsonb
WHERE key IN ('kundenportal', 'hundepension');

-- Admin-konfigurierbarer Zuschlag außerhalb Standardzeit (Bring-/Holzeiten)
INSERT INTO prices (
  id,
  name,
  description,
  price,
  price_type,
  unit,
  sort_order,
  category_id,
  usage
)
VALUES (
  'e5555555-5555-4555-a555-555555555551',
  'Bring-/Holzeit außerhalb Standardzeit',
  'Zuschlag pro Termin bei Bringen oder Abholen außerhalb der Standardfenster',
  8.00,
  'fixed',
  'pro Termin',
  10,
  'e5555555-5555-4555-e555-555555555555',
  'surcharge'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  unit = EXCLUDED.unit,
  sort_order = EXCLUDED.sort_order,
  category_id = EXCLUDED.category_id,
  usage = EXCLUDED.usage;
