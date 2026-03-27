--------------------------------------------------------------------------------
-- DfE 16–18 / A level school performance (Explore Education Statistics).
-- Cohort: exam_cohort = A level, disadvantage_status = Total, School level.
-- cohort_end_year: calendar year ending the academic cycle (e.g. 2025 = 2024/25).
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS school_ks5_results (
  id                              BIGSERIAL PRIMARY KEY,
  school_urn                      TEXT NOT NULL,
  school_id                       INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  cohort_end_year                 SMALLINT NOT NULL,
  academic_year_label             TEXT NOT NULL,
  school_name                     TEXT,
  la_name                         TEXT,
  version                         TEXT,
  end1618_student_count           INTEGER,
  aps_per_entry                   NUMERIC(6, 2),
  aps_per_entry_grade             TEXT,
  aps_per_entry_student_count     INTEGER,
  retained_percent                NUMERIC(6, 1),
  retained_assessed_percent       NUMERIC(6, 1),
  retained_student_count          INTEGER,
  value_added                     TEXT,
  value_added_upper_ci            TEXT,
  value_added_lower_ci            TEXT,
  progress_banding                TEXT,
  best_three_alevels_aps          NUMERIC(6, 2),
  best_three_alevels_grade        TEXT,
  best_three_alevels_student_count INTEGER,
  aab_percent                     NUMERIC(6, 1),
  aab_student_count               INTEGER,
  data_source_url                 TEXT,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_urn, cohort_end_year)
);

CREATE INDEX IF NOT EXISTS idx_school_ks5_urn ON school_ks5_results (school_urn);
CREATE INDEX IF NOT EXISTS idx_school_ks5_cohort ON school_ks5_results (cohort_end_year);
CREATE INDEX IF NOT EXISTS idx_school_ks5_school_id ON school_ks5_results (school_id);
