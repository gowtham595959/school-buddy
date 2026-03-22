-- Set catchment_alloc_seats to 125 for Nonsuch High School for Girls (school_id=2)
UPDATE catchment_definitions
SET catchment_alloc_seats = 125
WHERE school_id = (SELECT id FROM schools WHERE name ILIKE '%Nonsuch%' LIMIT 1)
  AND catchment_active = true;
