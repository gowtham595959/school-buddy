--------------------------------------------------------------------------------
-- Drawer flag for DfE 16–18 destinations panel (aligned with has_results_gcse pattern).
--------------------------------------------------------------------------------

ALTER TABLE schools ADD COLUMN IF NOT EXISTS has_results_destinations BOOLEAN;

UPDATE schools s
SET has_results_destinations = EXISTS (
  SELECT 1 FROM school_1618_destinations d
  WHERE d.school_id = s.id
     OR (
       d.school_id IS NULL
       AND s.school_code IS NOT NULL
       AND TRIM(d.school_urn) = TRIM(s.school_code)
     )
);
