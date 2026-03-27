----------------------------------------------------------
-- Link GCSE results rows to internal schools.id where URN matches.
-- Remaining rows (grammar schools not in app) keep school_id NULL.
----------------------------------------------------------

ALTER TABLE school_gcse_results
  ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_school_gcse_school_id ON school_gcse_results (school_id);

UPDATE school_gcse_results AS g
SET school_id = s.id
FROM schools AS s
WHERE s.school_code IS NOT NULL
  AND TRIM(s.school_code) <> ''
  AND TRIM(s.school_code) = TRIM(g.school_urn)
  AND (g.school_id IS DISTINCT FROM s.id);
