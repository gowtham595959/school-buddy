----------------------------------------------------------
-- Enable PostGIS (required for geometry columns)
----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;


----------------------------------------------------------
-- SCHOOLS TABLE
----------------------------------------------------------
DROP TABLE IF EXISTS schools CASCADE;

CREATE TABLE schools (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    lat  DOUBLE PRECISION NOT NULL,
    lon  DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326)
);


----------------------------------------------------------
-- CATCHMENTS TABLE (for radius-based schools like Wallington/Nonsuch)
----------------------------------------------------------
DROP TABLE IF EXISTS catchments CASCADE;

CREATE TABLE catchments (
    id        SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    radius_m  INTEGER NOT NULL
);


----------------------------------------------------------
-- POSTCODE POLYGONS TABLE (Tiffin catchment)
----------------------------------------------------------
DROP TABLE IF EXISTS postcodes CASCADE;

CREATE TABLE postcodes (
    id   SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,                 -- for ON CONFLICT (code)
    geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS postcodes_geom_idx
ON postcodes USING GIST (geom);

----------------------------------------------------------
-- DONE
----------------------------------------------------------
