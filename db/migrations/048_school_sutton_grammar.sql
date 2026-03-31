--------------------------------------------------------------------------------
-- Sutton Grammar School — DfE establishment 136787.
-- Sources: Get Information about Schools URN 136787; school site contact page
--   https://www.suttongrammar.sutton.sch.uk/information/contact-us-locations/
--   (address, phone 020 8642 3821, office@suttongrammar.school);
--   coordinates from Wikipedia infobox (51.36509°N, 0.18974°W);
--   LA Sutton / E09000029 from DfE open data (grammar_163 CSVs).
-- No catchment geometry in repo for this school: has_catchment false.
--------------------------------------------------------------------------------

INSERT INTO schools (
  name,
  lat,
  lon,
  location,
  display_name,
  website,
  phone,
  email,
  address,
  school_code,
  local_authority,
  council_name,
  council_borough_code,
  school_type,
  gender_type,
  boarding_type,
  selectivity_type,
  phase,
  age_range,
  religious_affiliation,
  fees,
  fees_notes,
  marker_style_key,
  icon_url,
  has_catchment,
  has_admissions,
  has_exams,
  has_allocations,
  show_radius,
  show_polygon,
  oxbridge_offers,
  source_url_oxbridge_offers,
  description
)
SELECT
  'Sutton Grammar School',
  51.36509,
  -0.18974,
  ST_SetSRID(ST_MakePoint(-0.18974, 51.36509), 4326),
  'Sutton Grammar School',
  'https://www.suttongrammar.sutton.sch.uk/',
  '020 8642 3821',
  'office@suttongrammar.school',
  'Manor Lane, Sutton, Surrey, SM1 4AS',
  '136787',
  'Sutton',
  'Sutton',
  'E09000029',
  'Grammar',
  'Boys',
  'Day',
  'Selective',
  'Secondary',
  '11-18',
  'None',
  'No fees (state funded)',
  NULL,
  'boys_state',
  '/icons/school_black.png',
  false,
  true,
  true,
  false,
  false,
  false,
  NULL,
  'https://www.suttongrammar.sutton.sch.uk/sixth-form/',
  'Selective state grammar school for boys (11–18); co-educational sixth form. Academy status from 1 June 2011 (Wikipedia, citing DfE); trust: Sutton Grammar School Trust.'
WHERE NOT EXISTS (
  SELECT 1 FROM schools WHERE school_code = '136787' OR name = 'Sutton Grammar School'
);

SELECT setval(
  pg_get_serial_sequence('schools', 'id'),
  COALESCE((SELECT MAX(id) FROM schools), 1)
);
