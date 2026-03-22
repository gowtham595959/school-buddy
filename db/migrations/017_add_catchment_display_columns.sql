----------------------------------------------------------
-- Add catchment_type_display and catchment_boundary_display
-- User-friendly labels; fallback to technical columns when null.
----------------------------------------------------------

ALTER TABLE catchment_definitions
  ADD COLUMN IF NOT EXISTS catchment_type_display TEXT,
  ADD COLUMN IF NOT EXISTS catchment_boundary_display TEXT;

-- Populate catchment_type_display from catchment_key
UPDATE catchment_definitions SET catchment_type_display = CASE
  WHEN LOWER(TRIM(catchment_key)) = 'inner' THEN 'Inner area'
  WHEN LOWER(TRIM(catchment_key)) = 'outer' THEN 'Outer area'
  WHEN LOWER(TRIM(catchment_key)) = 'pa1' THEN 'Priority area 1'
  WHEN LOWER(TRIM(catchment_key)) = 'pa2' THEN 'Priority area 2'
  WHEN LOWER(TRIM(catchment_key)) = 'pa3' THEN 'Priority area 3'
  WHEN LOWER(TRIM(catchment_key)) = 'open' THEN 'Open catchment'
  WHEN LOWER(TRIM(catchment_key)) = 'radius' THEN 'Distance-based'
  WHEN LOWER(TRIM(catchment_key)) = 'catchment' THEN 'Designated catchment'
  WHEN LOWER(TRIM(catchment_key)) = 'priority_1_2023' THEN 'Entry 2023 (priority 1)'
  WHEN LOWER(TRIM(catchment_key)) = 'priority_1_2024' THEN 'Entry 2024 (priority 1)'
  WHEN LOWER(TRIM(catchment_key)) = 'priority_1_2025' THEN 'Entry 2025 (priority 1)'
  WHEN LOWER(TRIM(catchment_key)) = 'priority_2_borough_islington' THEN 'Islington borough'
  WHEN LOWER(TRIM(catchment_key)) = 'priority_2_parish' THEN 'Parish area'
  WHEN LOWER(TRIM(catchment_key)) = 'priority_2_postcode_sector' THEN 'Postcode sector'
  WHEN LOWER(TRIM(catchment_key)) = 'priority_a' THEN 'Priority area A'
  WHEN LOWER(TRIM(catchment_key)) = 'priority_b' THEN 'Priority area B'
  WHEN LOWER(TRIM(catchment_key)) = 'priority_admission' THEN 'Admission priority'
  ELSE INITCAP(REPLACE(catchment_key, '_', ' '))
END
WHERE catchment_key IS NOT NULL AND catchment_key != '';

-- Populate catchment_boundary_display from geography_type
-- For radius: include actual radius value
UPDATE catchment_definitions SET catchment_boundary_display = CASE
  WHEN LOWER(TRIM(geography_type)) = 'radius' THEN
    'Straight-line distance (' || COALESCE(radius::TEXT, '—') ||
    CASE WHEN radius_unit IS NOT NULL AND TRIM(radius_unit) != '' THEN ' ' || TRIM(radius_unit) ELSE '' END
    || ')'
  WHEN LOWER(TRIM(geography_type)) = 'ward' THEN 'Electoral ward'
  WHEN LOWER(TRIM(geography_type)) = 'postcode_district' THEN 'Postcode district'
  WHEN LOWER(TRIM(geography_type)) = 'postcode_sector' THEN 'Postcode sector'
  WHEN LOWER(TRIM(geography_type)) = 'borough' THEN 'Borough'
  WHEN LOWER(TRIM(geography_type)) = 'parish' THEN 'Parish'
  WHEN LOWER(TRIM(geography_type)) = 'open' THEN 'Open (no fixed boundary)'
  WHEN LOWER(TRIM(geography_type)) = 'map_bucks_polygon' THEN 'Custom area (map)'
  ELSE INITCAP(REPLACE(geography_type, '_', ' '))
END
WHERE geography_type IS NOT NULL AND geography_type != '';
