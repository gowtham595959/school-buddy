----------------------------------------------------------
-- Exam drawer columns (additive-only, restore-safe).
-- After this, run 025 for renames/drops (exam_assessment_type, key_dates only, etc.).
----------------------------------------------------------

ALTER TABLE admissions_policies
  ADD COLUMN IF NOT EXISTS show_exam_details BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_exam_dates BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_stage_allocation BOOLEAN DEFAULT false;

ALTER TABLE admissions_policies
  ADD COLUMN IF NOT EXISTS exam_assessment_type TEXT,
  ADD COLUMN IF NOT EXISTS exam_stages JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exam_dates JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS allocation_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS exam_criteria JSONB;

-- Legacy names above are corrected by migration 025 (exam_assessment_type; drops exam_dates, exam_criteria).

CREATE UNIQUE INDEX IF NOT EXISTS admissions_policies_school_entry_unique
  ON admissions_policies (school_id, entry_year);

-- Supersedes non-unique idx_admissions_policies_school_year on restored DBs.
DROP INDEX IF EXISTS idx_admissions_policies_school_year;
