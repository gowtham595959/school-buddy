----------------------------------------------------------
-- Make admission_priority consistent for Nonsuch and Wallington
-- Wallington Open rows were missing it; set to match Nonsuch.
----------------------------------------------------------

UPDATE catchment_definitions
SET admission_priority = 'Exam score first'
WHERE school_id IN (
  SELECT id FROM schools WHERE name ILIKE '%Nonsuch%' OR name ILIKE '%Wallington%'
)
  AND catchment_active = true
  AND (admission_priority IS NULL OR admission_priority = '');
