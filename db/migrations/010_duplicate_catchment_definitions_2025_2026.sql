----------------------------------------------------------
-- Ensure each school has catchment definitions for both 2025 and 2026
-- Duplicates existing definitions to the other year (same content)
----------------------------------------------------------

-- Copy 2026 definitions to 2025 (where 2025 doesn't exist for that school+key)
INSERT INTO catchment_definitions (
  school_id, school_name, catchment_priority, catchment_key, catchment_year,
  catchment_alloc_seats, catchment_active, geography_type, radius, radius_unit,
  members, members_hash, members_display, style
)
SELECT
  cd.school_id, cd.school_name, cd.catchment_priority, cd.catchment_key, 2025,
  cd.catchment_alloc_seats, cd.catchment_active, cd.geography_type, cd.radius, cd.radius_unit,
  cd.members, cd.members_hash, cd.members_display, cd.style
FROM catchment_definitions cd
WHERE cd.catchment_year = 2026
  AND cd.catchment_active = true
  AND NOT EXISTS (
    SELECT 1 FROM catchment_definitions d2
    WHERE d2.school_id = cd.school_id
      AND d2.catchment_key = cd.catchment_key
      AND d2.catchment_year = 2025
  )
ON CONFLICT (school_id, catchment_key, catchment_year) DO NOTHING;

-- Copy 2025 definitions to 2026 (where 2026 doesn't exist for that school+key)
INSERT INTO catchment_definitions (
  school_id, school_name, catchment_priority, catchment_key, catchment_year,
  catchment_alloc_seats, catchment_active, geography_type, radius, radius_unit,
  members, members_hash, members_display, style
)
SELECT
  cd.school_id, cd.school_name, cd.catchment_priority, cd.catchment_key, 2026,
  cd.catchment_alloc_seats, cd.catchment_active, cd.geography_type, cd.radius, cd.radius_unit,
  cd.members, cd.members_hash, cd.members_display, cd.style
FROM catchment_definitions cd
WHERE cd.catchment_year = 2025
  AND cd.catchment_active = true
  AND NOT EXISTS (
    SELECT 1 FROM catchment_definitions d2
    WHERE d2.school_id = cd.school_id
      AND d2.catchment_key = cd.catchment_key
      AND d2.catchment_year = 2026
  )
ON CONFLICT (school_id, catchment_key, catchment_year) DO NOTHING;
