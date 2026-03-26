----------------------------------------------------------
-- Remove exam drawer: Previous marks table + Notes body.
-- Supersedes show_previous_marks, previous_marks_distribution, exam_panel_notes.
----------------------------------------------------------

ALTER TABLE admissions_policies
  DROP COLUMN IF EXISTS show_previous_marks,
  DROP COLUMN IF EXISTS previous_marks_distribution,
  DROP COLUMN IF EXISTS exam_panel_notes;
