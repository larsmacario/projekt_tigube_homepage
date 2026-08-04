-- An- und Abreise war fälschlich als 50‑%-Posten migriert (pauschal 19 €)
UPDATE prices
SET
  price_type = 'fixed',
  price = 19,
  unit = 'pauschal',
  description = 'Pauschale bei An- und Abreise an Samstagen, Sonntagen und gesetzlichen Feiertagen.',
  usage = COALESCE(usage, 'surcharge')
WHERE name = 'An- und Abreise an Sonn- und Feiertagen';
