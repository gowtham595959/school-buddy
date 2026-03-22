----------------------------------------------------------
-- Remove admission_policy_url from schools (moved to admissions_policies)
----------------------------------------------------------

ALTER TABLE schools DROP COLUMN IF EXISTS admission_policy_url;
