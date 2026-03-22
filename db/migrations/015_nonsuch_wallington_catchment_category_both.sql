-- Set catchment_category to 'both' for Nonsuch and Wallington
-- (they have both designated radius catchments and open allocation)
UPDATE schools
SET catchment_category = 'both'
WHERE name ILIKE '%Nonsuch%' OR name ILIKE '%Wallington%';
