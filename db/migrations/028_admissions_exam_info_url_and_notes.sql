----------------------------------------------------------
-- Exam drawer: link to school exam info + optional Notes block.
----------------------------------------------------------

ALTER TABLE admissions_policies
  ADD COLUMN IF NOT EXISTS exam_info_url TEXT,
  ADD COLUMN IF NOT EXISTS show_exam_notes BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT;
