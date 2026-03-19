-- Update gender_type, boarding_type, selectivity_type, top_school, catchment_category
-- for Tiffin Girls (1), Nonsuch (2), Wallington Girls (3)

-- All three: gender_type, boarding_type, selectivity_type, catchment_category
UPDATE schools
SET
  gender_type = 'Girls',
  boarding_type = 'Day',
  selectivity_type = 'Selective',
  catchment_category = 'Designated Catchment'
WHERE id IN (1, 2, 3);

-- Tiffin and Wallington only: top_school = true
UPDATE schools
SET top_school = true
WHERE id IN (1, 3);
