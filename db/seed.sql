----------------------------------------------------------
-- Seed schools
----------------------------------------------------------
INSERT INTO schools (name, lat, lon) VALUES
  ('Tiffin Girls', 51.4172, -0.2928),
  ('Nonsuch',      51.355417, -0.223868),
  ('Wallington',   51.348,    -0.1488)
ON CONFLICT (name) DO NOTHING;

-- Populate geom for schools (point geometry)
UPDATE schools
SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)
WHERE geom IS NULL;


----------------------------------------------------------
-- Seed radius-based catchments
----------------------------------------------------------
INSERT INTO catchments (school_id, radius_m)
SELECT id, 5250 FROM schools WHERE name = 'Nonsuch'
ON CONFLICT DO NOTHING;

INSERT INTO catchments (school_id, radius_m)
SELECT id, 6700 FROM schools WHERE name = 'Wallington'
ON CONFLICT DO NOTHING;

-- Tiffin Girls uses postcode polygons only
