----------------------------------------------------------
-- Add fees columns to schools (for XLS bulk import later)
----------------------------------------------------------
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS fees TEXT,
  ADD COLUMN IF NOT EXISTS fees_notes TEXT;

----------------------------------------------------------
-- Columns expected by schools.service.js (fresh DB / no backup)
----------------------------------------------------------
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS radius_km DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS show_radius BOOLEAN,
  ADD COLUMN IF NOT EXISTS show_polygon BOOLEAN,
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS marker_style_key TEXT,
  ADD COLUMN IF NOT EXISTS top_school BOOLEAN;
