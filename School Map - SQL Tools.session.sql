BEGIN;

UPDATE schools
SET
  lat = lat + 0.0180,
  lon = lon + 0.0120,
  location = ST_SetSRID(ST_MakePoint(lon + 0.0120, lat + 0.0180), 4326)
WHERE id = 12;  -- Chesham Grammar School

COMMIT;


select * from schools;