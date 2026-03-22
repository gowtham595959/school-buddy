----------------------------------------------------------
-- Create V2 tables and add schools columns required by migrations
-- (Run before other migrations on fresh DB; idempotent)
----------------------------------------------------------

-- Schools: add columns used by migrations 002+
ALTER TABLE schools ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS local_authority TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_type TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_code TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS phase TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS age_range TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS council_name TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS religious_affiliation TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gender_type TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS boarding_type TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS selectivity_type TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS catchment_category VARCHAR(255);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS has_catchment BOOLEAN;

-- Admissions policies (migration 008+)
CREATE TABLE IF NOT EXISTS admissions_policies (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  entry_year INTEGER NOT NULL,
  year_group INTEGER,
  total_intake INTEGER,
  policy_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catchment definitions (migration 012+)
CREATE TABLE IF NOT EXISTS catchment_definitions (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  school_name TEXT,
  catchment_priority INTEGER,
  catchment_key TEXT,
  catchment_year INTEGER,
  catchment_alloc_seats INTEGER,
  catchment_active BOOLEAN DEFAULT true,
  geography_type TEXT,
  radius NUMERIC,
  radius_unit TEXT,
  members JSONB DEFAULT '[]',
  members_hash TEXT,
  geojson_built_at TIMESTAMPTZ,
  style JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  members_display JSONB
);

-- Catchment geometries (used by API for map layers)
CREATE TABLE IF NOT EXISTS catchment_geometries (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  school_name TEXT,
  catchment_key TEXT,
  geometry_kind TEXT,
  member_code TEXT,
  built_from_members_hash TEXT,
  geojson JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canonical geometries (postcode polygons; large table, empty on fresh DB)
CREATE TABLE IF NOT EXISTS canonical_geometries (
  id BIGSERIAL PRIMARY KEY,
  geography_type TEXT,
  member_code TEXT,
  name TEXT,
  geom geometry(Geometry, 4326),
  geojson JSONB,
  source TEXT,
  dataset_version TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
