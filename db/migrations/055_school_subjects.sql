--------------------------------------------------------------------------------
-- GCSE-only gcse_subjects → school_subjects: KS4 + 16–18 subject entry rows
-- (DfE Compare schools style: subject, qualification, entries).
--------------------------------------------------------------------------------

ALTER TABLE gcse_subjects DROP CONSTRAINT IF EXISTS gcse_subjects_school_sort_obligation_name;

ALTER TABLE gcse_subjects RENAME TO school_subjects;

ALTER INDEX gcse_subjects_pkey RENAME TO school_subjects_pkey;
ALTER INDEX idx_gcse_subjects_school_id RENAME TO idx_school_subjects_school_id;
DROP INDEX IF EXISTS idx_gcse_subjects_school_obligation;

ALTER TABLE school_subjects RENAME COLUMN pupils_entered TO entries;

ALTER TABLE school_subjects ADD COLUMN level TEXT NOT NULL DEFAULT 'gcse';
ALTER TABLE school_subjects ADD CONSTRAINT school_subjects_level_chk
  CHECK (level IN ('gcse', 'alevel'));

ALTER TABLE school_subjects ADD COLUMN qualification TEXT NOT NULL DEFAULT 'GCSE';

UPDATE school_subjects SET qualification = 'GCSE', level = 'gcse';

ALTER TABLE school_subjects DROP COLUMN obligation_type;
ALTER TABLE school_subjects DROP COLUMN IF EXISTS exam_board;
ALTER TABLE school_subjects DROP COLUMN IF EXISTS cohort_note;

ALTER TABLE school_subjects ALTER COLUMN subject_name DROP NOT NULL;

CREATE UNIQUE INDEX school_subjects_school_level_sort_uniq
  ON school_subjects (school_id, level, sort_order);
CREATE INDEX idx_school_subjects_school_level ON school_subjects (school_id, level);

COMMENT ON TABLE school_subjects IS
  'Subjects entered (DfE performance tables style): Key Stage 4 and 16–18 / A level; subject may be null for published aggregate lines.';
COMMENT ON COLUMN school_subjects.entries IS
  'DfE published number of exam entries (compare cohort year on the school page).';
COMMENT ON COLUMN school_subjects.qualification IS
  'E.g. GCSE, GCE A level — as published.';
