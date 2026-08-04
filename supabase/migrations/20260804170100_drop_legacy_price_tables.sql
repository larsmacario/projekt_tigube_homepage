-- Legacy-Tabellen und Spalten nach Umstellung auf price_rules entfernen

DROP TABLE IF EXISTS customer_prices;
DROP TABLE IF EXISTS group_prices;

ALTER TABLE prices DROP COLUMN IF EXISTS customer_selectable;
