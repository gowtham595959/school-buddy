----------------------------------------------------------
-- Consolidate 11+ exam UI into admissions_policies (per cohort).
-- Drop unused normalized exam/criteria tables.
----------------------------------------------------------

-- Feature gates for drawer sections (explicit false = hidden; NULL = off)
ALTER TABLE admissions_policies
  ADD COLUMN IF NOT EXISTS show_exam_details BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_exam_dates BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_stage_allocation BOOLEAN DEFAULT false;

-- Scalar + structured fields (dates: use key_dates JSONB only)
ALTER TABLE admissions_policies
  ADD COLUMN IF NOT EXISTS admission_test BOOLEAN,
  ADD COLUMN IF NOT EXISTS test_authority TEXT,
  ADD COLUMN IF NOT EXISTS exam_assessment_type TEXT,
  ADD COLUMN IF NOT EXISTS exam_stages JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS allocation_snapshot JSONB;

-- One logical policy row per school + entry cohort
CREATE UNIQUE INDEX IF NOT EXISTS admissions_policies_school_entry_unique
  ON admissions_policies (school_id, entry_year);

-- Drop legacy tables (child → parent). IF EXISTS for DBs that never had them.
DROP TABLE IF EXISTS admission_exam_papers CASCADE;
DROP TABLE IF EXISTS admission_exams CASCADE;
DROP TABLE IF EXISTS admissions_criteria CASCADE;
