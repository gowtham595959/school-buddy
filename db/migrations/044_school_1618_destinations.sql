--------------------------------------------------------------------------------
-- DfE 16–18 destination measures (institution-level, Explore Education Statistics).
-- One row per school URN per leavers cohort (academic year when students finished 16–18).
-- Headline row: Level 3, Total breakdowns, Percentage — falls back to all-level Total if missing.
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS school_1618_destinations (
  id                         BIGSERIAL PRIMARY KEY,
  school_urn                 TEXT NOT NULL,
  school_id                  INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  cohort_end_year            SMALLINT NOT NULL,
  academic_year_label        TEXT NOT NULL,
  time_period                TEXT,
  school_name                TEXT,
  la_name                    TEXT,
  version                    TEXT,
  qualification_breakdown    TEXT,
  leavers_student_count      INTEGER,
  pct_overall                NUMERIC(6, 2),
  pct_education              NUMERIC(6, 2),
  pct_he                     NUMERIC(6, 2),
  pct_fe                     NUMERIC(6, 2),
  pct_other_education        NUMERIC(6, 2),
  pct_apprenticeship         NUMERIC(6, 2),
  pct_employment             NUMERIC(6, 2),
  pct_not_sustained          NUMERIC(6, 2),
  pct_unknown                NUMERIC(6, 2),
  data_source_url            TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_urn, cohort_end_year)
);

CREATE INDEX IF NOT EXISTS idx_school_1618_dest_urn ON school_1618_destinations (school_urn);
CREATE INDEX IF NOT EXISTS idx_school_1618_dest_cohort ON school_1618_destinations (cohort_end_year);
CREATE INDEX IF NOT EXISTS idx_school_1618_dest_school_id ON school_1618_destinations (school_id);
