----------------------------------------------------------
-- Exam panel: explicit admission test + authority; rename assessment column;
-- drop superseded columns; dates live in key_dates only.
----------------------------------------------------------

ALTER TABLE admissions_policies
  ADD COLUMN IF NOT EXISTS admission_test BOOLEAN,
  ADD COLUMN IF NOT EXISTS test_authority TEXT,
  ADD COLUMN IF NOT EXISTS exam_assessment_type TEXT;

ALTER TABLE admissions_policies
  DROP COLUMN IF EXISTS exam_criteria,
  DROP COLUMN IF EXISTS oversubscription_criteria,
  DROP COLUMN IF EXISTS catchment_requirements,
  DROP COLUMN IF EXISTS summary,
  DROP COLUMN IF EXISTS exam_dates;
