-- Portal: welche Zusatzpreise Kunden im Buchungswizard wählen dürfen
ALTER TABLE public.prices
  ADD COLUMN IF NOT EXISTS customer_selectable BOOLEAN NOT NULL DEFAULT true;

-- Nicht vom Kunden wählbar (Admin / automatische Schätzung)
UPDATE public.prices
SET customer_selectable = false
WHERE name ILIKE '%zwischenreinigung%'
   OR name ILIKE '%sonn%feiertag%'
   OR name ILIKE '%sonn-%feiertag%';

-- Sonn-/Feiertagszuschlag: fest 50 % vom Tagespreis
UPDATE public.prices
SET
  price = 50,
  price_type = 'percentage',
  unit = 'vom vereinbarten Tagespreis',
  description = '50 % vom vereinbarten Tagespreis (Samstage, Sonntage und gesetzliche Feiertage).'
WHERE name ILIKE '%sonn%feiertag%'
   OR name ILIKE '%sonn-%feiertag%';
