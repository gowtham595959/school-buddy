--------------------------------------------------------------------------------
-- GCSE-only gcse_subjects → school_subjects: KS4 + 16–18 subject entry rows
-- (DfE Compare schools style: subject, qualification, entries).
-- Idempotent: safe if school_subjects already has post-migration shape.
--------------------------------------------------------------------------------

DO $migration_055$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'school_subjects'
      AND column_name = 'level'
  ) THEN
    RAISE NOTICE '055_school_subjects: already applied (level column exists); skipping';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gcse_subjects'
  ) THEN
    RAISE NOTICE '055_school_subjects: gcse_subjects not found; skipping';
    RETURN;
  END IF;

  ALTER TABLE gcse_subjects DROP CONSTRAINT IF EXISTS gcse_subjects_school_sort_obligation_name;

  ALTER TABLE gcse_subjects RENAME TO school_subjects;

  ALTER INDEX gcse_subjects_pkey RENAME TO school_subjects_pkey;
  ALTER INDEX idx_gcse_subjects_school_id RENAME TO idx_school_subjects_school_id;
  DROP INDEX IF EXISTS idx_gcse_subjects_school_obligation;

  ALTER TABLE school_subjects RENAME COLUMN pupils_entered TO entries;

  ALTER TABLE school_subjects ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'gcse';
  ALTER TABLE school_subjects DROP CONSTRAINT IF EXISTS school_subjects_level_chk;
  ALTER TABLE school_subjects
    ADD CONSTRAINT school_subjects_level_chk CHECK (level IN ('gcse', 'alevel'));

  ALTER TABLE school_subjects ADD COLUMN IF NOT EXISTS qualification TEXT NOT NULL DEFAULT 'GCSE';

  UPDATE school_subjects SET qualification = 'GCSE', level = 'gcse';

  ALTER TABLE school_subjects DROP COLUMN IF EXISTS obligation_type;
  ALTER TABLE school_subjects DROP COLUMN IF EXISTS exam_board;
  ALTER TABLE school_subjects DROP COLUMN IF EXISTS cohort_note;

  ALTER TABLE school_subjects ALTER COLUMN subject_name DROP NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS school_subjects_school_level_sort_uniq
    ON school_subjects (school_id, level, sort_order);
  CREATE INDEX IF NOT EXISTS idx_school_subjects_school_level ON school_subjects (school_id, level);

  COMMENT ON TABLE school_subjects IS
'Subjects entered (DfE performance tables style): Key Stage 4 and 16–18 / A level; subject may be null for published aggregate lines.';
  COMMENT ON COLUMN school_subjects.entries IS
'DfE published number of exam entries (compare cohort year on the school page).';
  COMMENT ON COLUMN school_subjects.qualification IS
'E.g. GCSE, GCE A level — as published.';
END;
$migration_055$;
