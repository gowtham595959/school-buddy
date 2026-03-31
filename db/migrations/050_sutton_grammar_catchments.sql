--------------------------------------------------------------------------------
-- Sutton Grammar School (school_id 22): open + designated catchments.
-- Priority 1: Open — 75 allocation places; geography_type open (no polygon).
-- Priority 2: Designated — 75 places; postcode districts SM1–SM7, KT4, KT17, CR4
--   plus postcode sector CR0 4 (CR0 4xx) per user specification.
-- Catchment year 2026 only (same member list would be repeated for 2025; geometry
-- cache is per catchment_key + members_hash and hash includes year, so duplicate years
-- can mark geometries stale for the earlier year).
--------------------------------------------------------------------------------

UPDATE schools
SET
  has_catchment = true,
  catchment_category = 'both'
WHERE id = 22;

-- Priority 1 — Open (75 seats)
INSERT INTO catchment_definitions (
  school_id,
  school_name,
  catchment_priority,
  catchment_key,
  catchment_year,
  catchment_alloc_seats,
  catchment_active,
  geography_type,
  radius,
  radius_unit,
  members,
  style,
  admission_priority,
  catchment_type_display,
  catchment_boundary_display,
  catchment_alloc_seats_display
)
SELECT
  22,
  s.name,
  1,
  'Open',
  y.yr,
  75,
  true,
  'open',
  NULL,
  NULL,
  '[]'::jsonb,
  '{}'::jsonb,
  'Exam score first',
  'Open catchment',
  'Open (no fixed boundary)',
  '75'
FROM schools s
CROSS JOIN (VALUES (2026)) AS y(yr)
WHERE s.id = 22
ON CONFLICT (school_id, catchment_key, catchment_year) DO UPDATE SET
  school_name = EXCLUDED.school_name,
  catchment_priority = EXCLUDED.catchment_priority,
  catchment_alloc_seats = EXCLUDED.catchment_alloc_seats,
  catchment_active = EXCLUDED.catchment_active,
  geography_type = EXCLUDED.geography_type,
  radius = EXCLUDED.radius,
  radius_unit = EXCLUDED.radius_unit,
  members = EXCLUDED.members,
  admission_priority = EXCLUDED.admission_priority,
  catchment_type_display = EXCLUDED.catchment_type_display,
  catchment_boundary_display = EXCLUDED.catchment_boundary_display,
  catchment_alloc_seats_display = EXCLUDED.catchment_alloc_seats_display,
  updated_at = NOW();

-- Priority 2 — Designated postcode districts (75 seats)
INSERT INTO catchment_definitions (
  school_id,
  school_name,
  catchment_priority,
  catchment_key,
  catchment_year,
  catchment_alloc_seats,
  catchment_active,
  geography_type,
  radius,
  radius_unit,
  members,
  members_display,
  style,
  admission_priority,
  catchment_type_display,
  catchment_boundary_display,
  catchment_alloc_seats_display
)
SELECT
  22,
  s.name,
  2,
  'Designated',
  y.yr,
  75,
  true,
  'postcode_district',
  NULL,
  NULL,
  '["SM1","SM2","SM3","SM4","SM5","SM6","SM7","KT4","KT17","CR4"]'::jsonb,
  '[
    {"code":"SM1","name":"SM1"},{"code":"SM2","name":"SM2"},{"code":"SM3","name":"SM3"},
    {"code":"SM4","name":"SM4"},{"code":"SM5","name":"SM5"},{"code":"SM6","name":"SM6"},{"code":"SM7","name":"SM7"},
    {"code":"KT4","name":"KT4"},{"code":"KT17","name":"KT17"},{"code":"CR4","name":"CR4"}
  ]'::jsonb,
  '{}'::jsonb,
  'Exam score first',
  'Designated catchment',
  'Postcode districts: SM1–SM7, KT4, KT17, CR4',
  '75'
FROM schools s
CROSS JOIN (VALUES (2026)) AS y(yr)
WHERE s.id = 22
ON CONFLICT (school_id, catchment_key, catchment_year) DO UPDATE SET
  school_name = EXCLUDED.school_name,
  catchment_priority = EXCLUDED.catchment_priority,
  catchment_alloc_seats = EXCLUDED.catchment_alloc_seats,
  catchment_active = EXCLUDED.catchment_active,
  geography_type = EXCLUDED.geography_type,
  members = EXCLUDED.members,
  members_display = EXCLUDED.members_display,
  admission_priority = EXCLUDED.admission_priority,
  catchment_type_display = EXCLUDED.catchment_type_display,
  catchment_boundary_display = EXCLUDED.catchment_boundary_display,
  catchment_alloc_seats_display = EXCLUDED.catchment_alloc_seats_display,
  updated_at = NOW();

-- Priority 2 — CR0 4xx (single sector polygon in canonical_geometries; same priority band)
INSERT INTO catchment_definitions (
  school_id,
  school_name,
  catchment_priority,
  catchment_key,
  catchment_year,
  catchment_alloc_seats,
  catchment_active,
  geography_type,
  radius,
  radius_unit,
  members,
  members_display,
  style,
  admission_priority,
  catchment_type_display,
  catchment_boundary_display,
  catchment_alloc_seats_display
)
SELECT
  22,
  s.name,
  2,
  'Designated_CR0_4',
  y.yr,
  NULL,
  true,
  'postcode_sector',
  NULL,
  NULL,
  '["CR0 4"]'::jsonb,
  '[{"code":"CR0 4","name":"CR0 4"}]'::jsonb,
  '{}'::jsonb,
  'Exam score first',
  'Designated catchment (CR0 4xx)',
  'Postcode sector CR0 4',
  NULL
FROM schools s
CROSS JOIN (VALUES (2026)) AS y(yr)
WHERE s.id = 22
ON CONFLICT (school_id, catchment_key, catchment_year) DO UPDATE SET
  school_name = EXCLUDED.school_name,
  catchment_priority = EXCLUDED.catchment_priority,
  catchment_alloc_seats = EXCLUDED.catchment_alloc_seats,
  catchment_active = EXCLUDED.catchment_active,
  geography_type = EXCLUDED.geography_type,
  members = EXCLUDED.members,
  members_display = EXCLUDED.members_display,
  admission_priority = EXCLUDED.admission_priority,
  catchment_type_display = EXCLUDED.catchment_type_display,
  catchment_boundary_display = EXCLUDED.catchment_boundary_display,
  catchment_alloc_seats_display = EXCLUDED.catchment_alloc_seats_display,
  updated_at = NOW();
