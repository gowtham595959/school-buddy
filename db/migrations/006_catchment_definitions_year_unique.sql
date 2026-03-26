----------------------------------------------------------
-- Required before 010_duplicate_catchment_definitions_2025_2026.sql (ON CONFLICT)
----------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS catchment_definitions_school_key_year_uniq
  ON catchment_definitions (school_id, catchment_key, catchment_year);
