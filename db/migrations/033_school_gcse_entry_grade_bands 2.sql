----------------------------------------------------------
-- GCSE (9–1) Full Course exam-entry grade bands (DfE subject file).
-- Computed offline from subject_school_all_exam_entriesgrades CSV:
-- % of exam entries (not pupils) at grade 9 only, 8–9, 7–9, 6–9.
-- Includes Full Course + Full Course (Double Award). Closest official
-- analogue to league-table “high grades” shares; may differ from newspapers.
----------------------------------------------------------

ALTER TABLE school_gcse_results
  ADD COLUMN IF NOT EXISTS gcse_exam_entries_denominator INTEGER,
  ADD COLUMN IF NOT EXISTS gcse_entries_pct_grade_9 NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS gcse_entries_pct_grade_8_9 NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS gcse_entries_pct_grade_7_9 NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS gcse_entries_pct_grade_6_9 NUMERIC(6, 2);
