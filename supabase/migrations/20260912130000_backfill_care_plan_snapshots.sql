-- Neueste Änderung pro Tier mit aktuellem Live-Plan befüllen (Legacy-Daten)
UPDATE pet_care_plan_changes AS c
SET care_plan_snapshot = p.care_plan
FROM (
  SELECT DISTINCT ON (pet_id) id, pet_id
  FROM pet_care_plan_changes
  ORDER BY pet_id, changed_at DESC
) AS latest
JOIN pets AS p ON p.id = latest.pet_id
WHERE c.id = latest.id
  AND c.care_plan_snapshot IS NULL
  AND p.care_plan IS NOT NULL;
