--------------------------------------------------------------------------------
-- Replace unused school_subjects with gcse_subjects (curriculum + sources).
-- Idempotent: skipping when already migrated (055) or when gcse_subjects exists.
--------------------------------------------------------------------------------

DO $migration_052$
BEGIN
  -- Post-055: single table school_subjects with DfE-style columns — do not drop data.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'school_subjects'
      AND column_name = 'level'
  ) THEN
    RAISE NOTICE '052_gcse_subjects: already migrated (school_subjects.level exists); skipping';
    RETURN;
  END IF;

  -- Between 052 and 055: intermediate table name — do not recreate.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gcse_subjects'
  ) THEN
    RAISE NOTICE '052_gcse_subjects: gcse_subjects already exists; skipping';
    RETURN;
  END IF;

  DROP TABLE IF EXISTS school_subjects CASCADE;

  CREATE TABLE gcse_subjects (
    id                    BIGSERIAL PRIMARY KEY,
    school_id             INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    school_name           TEXT NOT NULL,
    school_urn            TEXT NOT NULL,
    sort_order            INTEGER NOT NULL DEFAULT 0,
    obligation_type       TEXT NOT NULL CHECK (obligation_type IN ('mandatory', 'optional')),
    subject_name          TEXT NOT NULL,
    exam_board            TEXT,
    pupils_entered        INTEGER,
    cohort_note           TEXT,
    notes                 TEXT,
    data_source_url       TEXT NOT NULL,
    source_tier           TEXT NOT NULL DEFAULT 'school'
      CHECK (source_tier IN ('school', 'dfe', 'council')),
    source_urls           JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT gcse_subjects_school_sort_obligation_name UNIQUE (school_id, sort_order)
  );

  CREATE INDEX idx_gcse_subjects_school_id ON gcse_subjects (school_id);
  CREATE INDEX idx_gcse_subjects_school_obligation ON gcse_subjects (school_id, obligation_type);

  COMMENT ON TABLE gcse_subjects IS
'GCSE curriculum lines per school: mandatory before optional; optional sources in source_urls JSON.';
  COMMENT ON COLUMN gcse_subjects.source_urls IS
'E.g. [{"label":"School curriculum page","url":"..."},{"label":"DfE KS4 subject entries","url":"..."}].';

  UPDATE schools SET has_subjects = FALSE WHERE has_subjects IS DISTINCT FROM FALSE;
END;
$migration_052$;
