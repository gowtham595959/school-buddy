----------------------------------------------------------
-- GCSE / KS4 headline metrics per school URN per cohort end year.
-- cohort_end_year: calendar year when the academic year ends (e.g. 2025 = 2024/25).
-- Source: DfE Key stage 4 performance (Explore Education Statistics).
----------------------------------------------------------

CREATE TABLE IF NOT EXISTS school_gcse_results (
  id                      BIGSERIAL PRIMARY KEY,
  school_urn              TEXT NOT NULL,
  cohort_end_year         SMALLINT NOT NULL,
  academic_year_label     TEXT NOT NULL,
  school_name             TEXT,
  la_name                 TEXT,
  version                 TEXT,
  pupil_count             INTEGER,
  attainment8_average     NUMERIC(8, 2),
  progress8_average       TEXT,
  progress8_lower_95_ci   TEXT,
  progress8_upper_95_ci   TEXT,
  engmath_95_percent      NUMERIC(8, 2),
  engmath_94_percent      NUMERIC(8, 2),
  gcse_91_percent         NUMERIC(8, 2),
  ebacc_entering_percent  NUMERIC(8, 2),
  ebacc_aps_average       NUMERIC(8, 3),
  gcse_five_engmath_percent NUMERIC(8, 2),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_urn, cohort_end_year)
);

CREATE INDEX IF NOT EXISTS idx_school_gcse_urn ON school_gcse_results (school_urn);
CREATE INDEX IF NOT EXISTS idx_school_gcse_cohort ON school_gcse_results (cohort_end_year);
