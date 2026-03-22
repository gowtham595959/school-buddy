-- Add Open catchment definitions for Nonsuch High School for Girls (school_id=2)
-- One row each for 2025 and 2026: priority 2, key 'Open', alloc 85, geography_type 'open'
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
  85,
  true,
  'open',
  NULL,
  NULL,
  '[]'::jsonb,
  '{}'::jsonb
FROM schools s
CROSS JOIN (VALUES (2025), (2026)) AS y(yr)
WHERE s.name ILIKE '%Nonsuch%'
  AND NOT EXISTS (
    SELECT 1 FROM catchment_definitions cd
    WHERE cd.school_id = s.id AND cd.catchment_key = 'Open' AND cd.catchment_year = y.yr
  );

-- Alternative: use ON CONFLICT if rows might already exist
-- ON CONFLICT (school_id, catchment_key, catchment_year) DO NOTHING;
