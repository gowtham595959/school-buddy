----------------------------------------------------------
-- Add admission_policy_url to schools
-- Populate with school-specific admission policy PDF/page links.
----------------------------------------------------------

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS admission_policy_url TEXT;
