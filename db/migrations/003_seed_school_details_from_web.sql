----------------------------------------------------------
-- Seed school details from Get Information About Schools (GOV.UK)
-- Idempotent: only updates columns that are NULL or empty
----------------------------------------------------------

-- ============ religious_affiliation (all three girls' schools: None) ============
UPDATE schools SET religious_affiliation = 'None'
WHERE id IN (1, 2, 3) AND (religious_affiliation IS NULL OR religious_affiliation = '');

-- ============ Wilson's School (id=7) ============
UPDATE schools SET display_name = 'Wilson''s School'
WHERE name = 'Wilson''s School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '136621'
WHERE name = 'Wilson''s School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Sutton', council_name = 'Sutton'
WHERE name = 'Wilson''s School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Wilson''s School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Boys', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Wilson''s School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'Church of England'
WHERE name = 'Wilson''s School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Wilson''s School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Mollison Drive, Wallington, Surrey, SM6 9JW'
WHERE name = 'Wilson''s School' AND (address IS NULL OR address = '');
UPDATE schools SET phone = '020 8773 2931', email = 'office@wilsonsschool.sutton.sch.uk'
WHERE name = 'Wilson''s School' AND (phone IS NULL OR phone = '');
UPDATE schools SET website = 'https://www.wilsons.school'
WHERE name = 'Wilson''s School' AND (website IS NULL OR website = '');

-- ============ Gravesend Grammar School (id=6) ============
UPDATE schools SET display_name = 'Gravesend Grammar School'
WHERE name = 'Gravesend Grammar School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '137099'
WHERE name = 'Gravesend Grammar School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Kent', council_name = 'Kent'
WHERE name = 'Gravesend Grammar School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Gravesend Grammar School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Boys', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Gravesend Grammar School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Gravesend Grammar School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Gravesend Grammar School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Church Walk, Gravesend, Kent, DA12 2PR'
WHERE name = 'Gravesend Grammar School' AND (address IS NULL OR address = '');
UPDATE schools SET website = 'https://gravesendgrammar.com'
WHERE name = 'Gravesend Grammar School' AND (website IS NULL OR website = '');

-- ============ Aylesbury Grammar School (id=8) ============
UPDATE schools SET display_name = 'Aylesbury Grammar School'
WHERE name = 'Aylesbury Grammar School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '136884'
WHERE name = 'Aylesbury Grammar School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'Aylesbury Grammar School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Aylesbury Grammar School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Boys', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Aylesbury Grammar School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Aylesbury Grammar School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Aylesbury Grammar School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Walton Road, Aylesbury, Buckinghamshire, HP21 7RP'
WHERE name = 'Aylesbury Grammar School' AND (address IS NULL OR address = '');
UPDATE schools SET website = 'https://www.ags.bucks.sch.uk'
WHERE name = 'Aylesbury Grammar School' AND (website IS NULL OR website = '');

-- ============ Aylesbury High School (id=9) ============
UPDATE schools SET display_name = 'Aylesbury High School'
WHERE name = 'Aylesbury High School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '136846'
WHERE name = 'Aylesbury High School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'Aylesbury High School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Aylesbury High School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Girls', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Aylesbury High School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Aylesbury High School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Aylesbury High School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Walton Road, Aylesbury, Buckinghamshire, HP21 7SX'
WHERE name = 'Aylesbury High School' AND (address IS NULL OR address = '');
UPDATE schools SET website = 'https://www.ahs.bucks.sch.uk'
WHERE name = 'Aylesbury High School' AND (website IS NULL OR website = '');

-- ============ Beaconsfield High School (id=10) ============
UPDATE schools SET display_name = 'Beaconsfield High School'
WHERE name = 'Beaconsfield High School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '140893'
WHERE name = 'Beaconsfield High School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'Beaconsfield High School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Beaconsfield High School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Girls', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Beaconsfield High School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Beaconsfield High School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Beaconsfield High School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Wattleton Road, Beaconsfield, Buckinghamshire, HP9 1RR'
WHERE name = 'Beaconsfield High School' AND (address IS NULL OR address = '');
UPDATE schools SET phone = '01494 673043'
WHERE name = 'Beaconsfield High School' AND (phone IS NULL OR phone = '');
UPDATE schools SET website = 'https://www.beaconsfieldhigh.school'
WHERE name = 'Beaconsfield High School' AND (website IS NULL OR website = '');

-- ============ Burnham Grammar School (id=11) ============
UPDATE schools SET display_name = 'Burnham Grammar School'
WHERE name = 'Burnham Grammar School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '137564'
WHERE name = 'Burnham Grammar School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'Burnham Grammar School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Burnham Grammar School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Mixed', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Burnham Grammar School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Burnham Grammar School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Burnham Grammar School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Hogfair Lane, Burnham, Slough, SL1 7HG'
WHERE name = 'Burnham Grammar School' AND (address IS NULL OR address = '');
UPDATE schools SET website = 'https://www.burnhamgrammar.org.uk'
WHERE name = 'Burnham Grammar School' AND (website IS NULL OR website = '');

-- ============ Chesham Grammar School (id=12) ============
UPDATE schools SET display_name = 'Chesham Grammar School'
WHERE name = 'Chesham Grammar School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '137091'
WHERE name = 'Chesham Grammar School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'Chesham Grammar School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Chesham Grammar School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Mixed', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Chesham Grammar School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Chesham Grammar School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Chesham Grammar School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'White Hill, Chesham, Buckinghamshire, HP5 1BA'
WHERE name = 'Chesham Grammar School' AND (address IS NULL OR address = '');
UPDATE schools SET website = 'https://www.cheshamgrammar.org'
WHERE name = 'Chesham Grammar School' AND (website IS NULL OR website = '');

-- ============ Dr Challoner's Grammar School (id=13, boys) ============
UPDATE schools SET display_name = 'Dr Challoner''s Grammar School'
WHERE name = 'Dr Challoner''s Grammar School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '136419'
WHERE name = 'Dr Challoner''s Grammar School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'Dr Challoner''s Grammar School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Dr Challoner''s Grammar School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Boys', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Dr Challoner''s Grammar School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Dr Challoner''s Grammar School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Dr Challoner''s Grammar School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Chesham Road, Amersham, Buckinghamshire, HP6 5HA'
WHERE name = 'Dr Challoner''s Grammar School' AND (address IS NULL OR address = '');
UPDATE schools SET website = 'https://www.challoners.com'
WHERE name = 'Dr Challoner''s Grammar School' AND (website IS NULL OR website = '');

-- ============ Dr Challoner's High School (id=14, girls) ============
UPDATE schools SET display_name = 'Dr Challoner''s High School'
WHERE name = 'Dr Challoner''s High School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '137219'
WHERE name = 'Dr Challoner''s High School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'Dr Challoner''s High School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Dr Challoner''s High School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Girls', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Dr Challoner''s High School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Dr Challoner''s High School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Dr Challoner''s High School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Cokes Lane, Little Chalfont, Amersham, Buckinghamshire, HP7 9QB'
WHERE name = 'Dr Challoner''s High School' AND (address IS NULL OR address = '');
UPDATE schools SET phone = '01494 763296'
WHERE name = 'Dr Challoner''s High School' AND (phone IS NULL OR phone = '');
UPDATE schools SET website = 'https://www.challonershigh.com'
WHERE name = 'Dr Challoner''s High School' AND (website IS NULL OR website = '');

-- ============ John Hampden Grammar School (id=15) ============
UPDATE schools SET display_name = 'John Hampden Grammar School'
WHERE name = 'John Hampden Grammar School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '136771'
WHERE name = 'John Hampden Grammar School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'John Hampden Grammar School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'John Hampden Grammar School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Boys', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'John Hampden Grammar School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'John Hampden Grammar School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'John Hampden Grammar School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Marlow Hill, High Wycombe, Buckinghamshire, HP11 1SZ'
WHERE name = 'John Hampden Grammar School' AND (address IS NULL OR address = '');
UPDATE schools SET website = 'https://www.johnhampdengrammar.org'
WHERE name = 'John Hampden Grammar School' AND (website IS NULL OR website = '');

-- ============ The Royal Grammar School, High Wycombe (id=16) ============
UPDATE schools SET display_name = 'The Royal Grammar School, High Wycombe'
WHERE name = 'The Royal Grammar School, High Wycombe' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '136484'
WHERE name = 'The Royal Grammar School, High Wycombe' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'The Royal Grammar School, High Wycombe' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'The Royal Grammar School, High Wycombe' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Boys', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'The Royal Grammar School, High Wycombe' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'The Royal Grammar School, High Wycombe' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'The Royal Grammar School, High Wycombe' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Amersham Road, High Wycombe, Buckinghamshire, HP13 6QT'
WHERE name = 'The Royal Grammar School, High Wycombe' AND (address IS NULL OR address = '');
UPDATE schools SET phone = '01494 524955'
WHERE name = 'The Royal Grammar School, High Wycombe' AND (phone IS NULL OR phone = '');
UPDATE schools SET website = 'https://www.rgshw.com'
WHERE name = 'The Royal Grammar School, High Wycombe' AND (website IS NULL OR website = '');

-- ============ Royal Latin School (id=17) ============
UPDATE schools SET display_name = 'Royal Latin School'
WHERE name = 'Royal Latin School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '137344'
WHERE name = 'Royal Latin School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'Royal Latin School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Royal Latin School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Mixed', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Royal Latin School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Royal Latin School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Royal Latin School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Chandos Road, Buckingham, Buckinghamshire, MK18 1AX'
WHERE name = 'Royal Latin School' AND (address IS NULL OR address = '');
UPDATE schools SET website = 'https://www.royallatin.org'
WHERE name = 'Royal Latin School' AND (website IS NULL OR website = '');

-- ============ Sir Henry Floyd Grammar School (id=18) ============
UPDATE schools SET display_name = 'Sir Henry Floyd Grammar School'
WHERE name = 'Sir Henry Floyd Grammar School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '136845'
WHERE name = 'Sir Henry Floyd Grammar School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'Sir Henry Floyd Grammar School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Sir Henry Floyd Grammar School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Mixed', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Sir Henry Floyd Grammar School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Sir Henry Floyd Grammar School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Sir Henry Floyd Grammar School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Oxford Road, Aylesbury, Buckinghamshire, HP21 8PE'
WHERE name = 'Sir Henry Floyd Grammar School' AND (address IS NULL OR address = '');
UPDATE schools SET website = 'https://www.sirhenryfloyd.co.uk'
WHERE name = 'Sir Henry Floyd Grammar School' AND (website IS NULL OR website = '');

-- ============ Sir William Borlase's Grammar School (id=19) ============
UPDATE schools SET display_name = 'Sir William Borlase''s Grammar School'
WHERE name = 'Sir William Borlase''s Grammar School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '136781'
WHERE name = 'Sir William Borlase''s Grammar School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'Sir William Borlase''s Grammar School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Sir William Borlase''s Grammar School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Mixed', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Sir William Borlase''s Grammar School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Sir William Borlase''s Grammar School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Sir William Borlase''s Grammar School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'West Street, Marlow, Buckinghamshire, SL7 2BR'
WHERE name = 'Sir William Borlase''s Grammar School' AND (address IS NULL OR address = '');
UPDATE schools SET website = 'https://www.swbgs.com'
WHERE name = 'Sir William Borlase''s Grammar School' AND (website IS NULL OR website = '');

-- ============ Wycombe High School (id=20) ============
UPDATE schools SET display_name = 'Wycombe High School'
WHERE name = 'Wycombe High School' AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '136723'
WHERE name = 'Wycombe High School' AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Buckinghamshire', council_name = 'Buckinghamshire'
WHERE name = 'Wycombe High School' AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE name = 'Wycombe High School' AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Girls', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE name = 'Wycombe High School' AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE name = 'Wycombe High School' AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE name = 'Wycombe High School' AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Marlow Road, High Wycombe, Buckinghamshire, HP11 1TB'
WHERE name = 'Wycombe High School' AND (address IS NULL OR address = '');
UPDATE schools SET website = 'https://www.whs.bucks.sch.uk'
WHERE name = 'Wycombe High School' AND (website IS NULL OR website = '');

-- ============ Dame Alice Owen's School (id=21) — match by name or address ============
UPDATE schools SET display_name = 'Dame Alice Owen''s School'
WHERE (name ILIKE '%Dame Alice Owen%' OR address LIKE '%Dugdale Hill Lane%Potters Bar%') AND (display_name IS NULL OR display_name = '');
UPDATE schools SET school_code = '136554'
WHERE (name ILIKE '%Dame Alice Owen%' OR address LIKE '%Dugdale Hill Lane%Potters Bar%') AND (school_code IS NULL OR school_code = '');
UPDATE schools SET local_authority = 'Hertfordshire', council_name = 'Hertfordshire'
WHERE (name ILIKE '%Dame Alice Owen%' OR address LIKE '%Dugdale Hill Lane%Potters Bar%') AND (local_authority IS NULL OR local_authority = '');
UPDATE schools SET school_type = 'Academy', phase = 'Secondary', age_range = '11-18'
WHERE (name ILIKE '%Dame Alice Owen%' OR address LIKE '%Dugdale Hill Lane%Potters Bar%') AND (school_type IS NULL OR school_type = '');
UPDATE schools SET gender_type = 'Mixed', boarding_type = 'Day', selectivity_type = 'Selective'
WHERE (name ILIKE '%Dame Alice Owen%' OR address LIKE '%Dugdale Hill Lane%Potters Bar%') AND (gender_type IS NULL OR gender_type = '');
UPDATE schools SET religious_affiliation = 'None'
WHERE (name ILIKE '%Dame Alice Owen%' OR address LIKE '%Dugdale Hill Lane%Potters Bar%') AND (religious_affiliation IS NULL OR religious_affiliation = '');
UPDATE schools SET fees = 'No fees (state funded)'
WHERE (name ILIKE '%Dame Alice Owen%' OR address LIKE '%Dugdale Hill Lane%Potters Bar%') AND (fees IS NULL OR fees = '');
UPDATE schools SET address = 'Dugdale Hill Lane, Potters Bar, Hertfordshire, EN6 2DU'
WHERE (name ILIKE '%Dame Alice Owen%' OR address LIKE '%Dugdale Hill Lane%Potters Bar%') AND (address IS NULL OR address = '');
UPDATE schools SET phone = '01707 643441', email = 'admin@damealiceowens.herts.sch.uk'
WHERE (name ILIKE '%Dame Alice Owen%' OR address LIKE '%Dugdale Hill Lane%Potters Bar%') AND (phone IS NULL OR phone = '');
UPDATE schools SET website = 'https://damealiceowens.herts.sch.uk'
WHERE (name ILIKE '%Dame Alice Owen%' OR address LIKE '%Dugdale Hill Lane%Potters Bar%') AND (website IS NULL OR website = '');
