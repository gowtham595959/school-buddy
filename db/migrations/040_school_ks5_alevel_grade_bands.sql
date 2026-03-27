--------------------------------------------------------------------------------
-- A level grade bands from DfE institution_subject_and_qualification_results:
-- % of GCE A level exam entries at A*, at A*/A, at A*/A/B (entries-based).
--------------------------------------------------------------------------------

ALTER TABLE school_ks5_results
  ADD COLUMN IF NOT EXISTS alevel_exam_entries_denominator INTEGER,
  ADD COLUMN IF NOT EXISTS alevel_entries_pct_grade_astar NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS alevel_entries_pct_grade_astar_a NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS alevel_entries_pct_grade_astar_a_b NUMERIC(6, 2);
