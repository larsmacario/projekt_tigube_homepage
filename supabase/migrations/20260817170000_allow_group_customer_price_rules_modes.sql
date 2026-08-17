-- Erlaube rule_mode 'not_applicable' und 'inherit' auch für Gruppen und Kunden
ALTER TABLE price_rules
  DROP CONSTRAINT IF EXISTS price_rules_pet_only_inherit_modes;
