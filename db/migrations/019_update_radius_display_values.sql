----------------------------------------------------------
-- Update display values for radius:
-- Catchment Type: "Distance-based" -> "Radius"
-- Catchment Boundary: "Straight-line distance (X km)" -> "X km" (value and unit only)
----------------------------------------------------------

-- Catchment Type: radius -> "Radius"
UPDATE catchment_definitions
SET catchment_type_display = 'Radius'
WHERE LOWER(TRIM(catchment_key)) = 'radius';

-- Catchment Boundary: radius -> just value and unit (e.g. "6.7 km")
UPDATE catchment_definitions
SET catchment_boundary_display = COALESCE(radius::TEXT, '—') ||
  CASE WHEN radius_unit IS NOT NULL AND TRIM(radius_unit) != '' THEN ' ' || TRIM(radius_unit) ELSE '' END
WHERE LOWER(TRIM(geography_type)) = 'radius';
