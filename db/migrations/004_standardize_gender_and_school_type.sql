----------------------------------------------------------
-- Standardize gender_type (Girls, Boys, Mixed) and school_type (Grammar)
----------------------------------------------------------

-- 1. Gender: consistent capitalization (Girls, Boys, Mixed)
UPDATE schools SET gender_type = 'Girls' WHERE LOWER(TRIM(gender_type)) = 'girls';
UPDATE schools SET gender_type = 'Boys' WHERE LOWER(TRIM(gender_type)) = 'boys';
UPDATE schools SET gender_type = 'Mixed' WHERE LOWER(TRIM(gender_type)) = 'mixed';

-- 2. School type: all grammar schools → 'Grammar' (except Dame Alice Owen's)
UPDATE schools SET school_type = 'Grammar'
WHERE name NOT ILIKE '%Dame Alice Owen%'
  AND (school_type = 'Academy' OR school_type = 'Grammar' OR school_type IS NULL OR school_type = '');
