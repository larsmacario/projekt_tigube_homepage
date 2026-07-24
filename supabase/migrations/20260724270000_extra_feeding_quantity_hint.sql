-- Klare Vorgabe für automatische Mengenberechnung (Fütterungen pro Tag) im Buchungswizard
UPDATE public.prices
SET description = '1 Fütterung pro Tag. Mitgebrachtes Futter (BARF/gekocht, tiefgefroren).'
WHERE lower(coalesce(unit, '')) LIKE '%fütterung%'
  AND price_type = 'per_unit'
  AND (
    description IS NULL
    OR description = ''
    OR description NOT ILIKE '%fütterung%pro%tag%'
  );
