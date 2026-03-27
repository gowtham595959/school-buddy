----------------------------------------------------------
-- Enable GCSE results drawer for in-app grammar schools (19).
----------------------------------------------------------

ALTER TABLE schools ADD COLUMN IF NOT EXISTS has_results_gcse BOOLEAN;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS has_results_alevel BOOLEAN;

UPDATE schools
SET has_results_gcse = true
WHERE id IN (1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21);
