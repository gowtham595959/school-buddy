-- Add Open catchment definitions for Wallington (school_id=3), like Nonsuch
-- Open: priority 2, 100 seats each for 2025 and 2026
-- Update radius rows to 110 seats
INSERT INTO catchment_definitions (
  school_id, school_name, catchment_priority, catchment_key, catchment_year,
  catchment_alloc_seats, catchment_active, geography_type, radius, radius_unit,
  members, style
)
SELECT
  s.id,
  s.name,
  2,
  'Open',
  y.yr,
  100,
  true,
  'open',
  NULL,
  NULL,
  '[]'::jsonb,
  '{}'::jsonb
FROM schools s
CROSS JOIN (VALUES (2025), (2026)) AS y(yr)
WHERE s.name ILIKE '%Wallington%'
  AND NOT EXISTS (
    SELECT 1 FROM catchment_definitions cd
    WHERE cd.school_id = s.id AND cd.catchment_key = 'Open' AND cd.catchment_year = y.yr
  );

UPDATE catchment_definitions
SET catchment_alloc_seats = 110
WHERE school_id = (SELECT id FROM schools WHERE name ILIKE '%Wallington%' LIMIT 1)
  AND catchment_key = 'radius'
  AND catchment_active = true;
