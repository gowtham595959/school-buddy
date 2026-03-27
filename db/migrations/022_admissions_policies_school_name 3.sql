----------------------------------------------------------
-- Denormalized school label on admissions_policies (for queries / SQLTools).
-- Source: schools.display_name when non-empty, else schools.name
----------------------------------------------------------

ALTER TABLE admissions_policies
  ADD COLUMN IF NOT EXISTS school_name TEXT;

UPDATE admissions_policies ap
SET school_name = COALESCE(NULLIF(TRIM(s.display_name), ''), s.name)
FROM schools s
WHERE ap.school_id = s.id;
