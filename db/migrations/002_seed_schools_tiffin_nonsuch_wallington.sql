----------------------------------------------------------
-- Seed data for Tiffin Girls, Nonsuch, Wallington Girls
-- Idempotent: only updates where value is NULL or empty
----------------------------------------------------------

-- ============ The Tiffin Girls' School (id=1) ============
UPDATE schools SET display_name = 'The Tiffin Girls'' School'
WHERE id = 1 AND (display_name IS NULL OR display_name = '');

UPDATE schools SET website = 'https://www.tiffingirls.org'
WHERE id = 1 AND (website IS NULL OR website = '');

UPDATE schools SET phone = '020 8546 0773'
WHERE id = 1 AND (phone IS NULL OR phone = '');

UPDATE schools SET email = 'office@tiffingirls.org'
WHERE id = 1 AND (email IS NULL OR email = '');

UPDATE schools SET address = 'Richmond Road, Kingston upon Thames, Surrey, KT2 5PL'
WHERE id = 1 AND (address IS NULL OR address = '');

UPDATE schools SET local_authority = 'Kingston upon Thames'
WHERE id = 1 AND (local_authority IS NULL OR local_authority = '');

UPDATE schools SET school_type = 'Academy'
WHERE id = 1 AND (school_type IS NULL OR school_type = '');

UPDATE schools SET school_code = '136615'
WHERE id = 1 AND (school_code IS NULL OR school_code = '');

UPDATE schools SET phase = 'Secondary'
WHERE id = 1 AND (phase IS NULL OR phase = '');

UPDATE schools SET age_range = '11-18'
WHERE id = 1 AND (age_range IS NULL OR age_range = '');

UPDATE schools SET council_name = 'Kingston upon Thames'
WHERE id = 1 AND (council_name IS NULL OR council_name = '');

UPDATE schools SET fees = 'No fees (state funded)', fees_notes = NULL
WHERE id = 1 AND (fees IS NULL OR fees = '');

-- ============ Nonsuch High School for Girls (id=2) ============
UPDATE schools SET display_name = 'Nonsuch High School for Girls'
WHERE id = 2 AND (display_name IS NULL OR display_name = '');

UPDATE schools SET website = 'https://www.nonsuchschool.org'
WHERE id = 2 AND (website IS NULL OR website = '');

UPDATE schools SET phone = '020 8394 3400'
WHERE id = 2 AND (phone IS NULL OR phone = '');

UPDATE schools SET email = 'office@nonsuchschool.org'
WHERE id = 2 AND (email IS NULL OR email = '');

UPDATE schools SET address = 'Ewell Road, Cheam, Sutton, Surrey, SM3 8AB'
WHERE id = 2 AND (address IS NULL OR address = '');

UPDATE schools SET local_authority = 'Sutton'
WHERE id = 2 AND (local_authority IS NULL OR local_authority = '');

UPDATE schools SET school_type = 'Academy'
WHERE id = 2 AND (school_type IS NULL OR school_type = '');

UPDATE schools SET school_code = '136795'
WHERE id = 2 AND (school_code IS NULL OR school_code = '');

UPDATE schools SET phase = 'Secondary'
WHERE id = 2 AND (phase IS NULL OR phase = '');

UPDATE schools SET age_range = '11-18'
WHERE id = 2 AND (age_range IS NULL OR age_range = '');

UPDATE schools SET council_name = 'Sutton'
WHERE id = 2 AND (council_name IS NULL OR council_name = '');

UPDATE schools SET fees = 'No fees (state funded)', fees_notes = NULL
WHERE id = 2 AND (fees IS NULL OR fees = '');

-- ============ Wallington High School for Girls (id=3) ============
UPDATE schools SET display_name = 'Wallington High School for Girls'
WHERE id = 3 AND (display_name IS NULL OR display_name = '');

UPDATE schools SET website = 'https://www.wallingtongirls.org.uk'
WHERE id = 3 AND (website IS NULL OR website = '');

UPDATE schools SET phone = '020 8647 2380'
WHERE id = 3 AND (phone IS NULL OR phone = '');

UPDATE schools SET email = 'info@wallingtongirls.org.uk'
WHERE id = 3 AND (email IS NULL OR email = '');

UPDATE schools SET address = 'Woodcote Road, Wallington, Surrey, SM6 0PH'
WHERE id = 3 AND (address IS NULL OR address = '');

UPDATE schools SET local_authority = 'Sutton'
WHERE id = 3 AND (local_authority IS NULL OR local_authority = '');

UPDATE schools SET school_type = 'Academy'
WHERE id = 3 AND (school_type IS NULL OR school_type = '');

UPDATE schools SET school_code = '136789'
WHERE id = 3 AND (school_code IS NULL OR school_code = '');

UPDATE schools SET phase = 'Secondary'
WHERE id = 3 AND (phase IS NULL OR phase = '');

UPDATE schools SET age_range = '11-18'
WHERE id = 3 AND (age_range IS NULL OR age_range = '');

UPDATE schools SET council_name = 'Sutton'
WHERE id = 3 AND (council_name IS NULL OR council_name = '');

UPDATE schools SET fees = 'No fees (state funded)', fees_notes = NULL
WHERE id = 3 AND (fees IS NULL OR fees = '');

-- ============ Flags for all three ============
UPDATE schools
SET
  gender_type = 'Girls',
  boarding_type = 'Day',
  selectivity_type = 'Selective',
  catchment_category = 'Designated Catchment'
WHERE id IN (1, 2, 3);

UPDATE schools SET top_school = true
WHERE id IN (1, 3);
