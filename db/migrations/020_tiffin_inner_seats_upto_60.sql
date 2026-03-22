----------------------------------------------------------
-- Add catchment_alloc_seats_display for custom text (e.g. "Upto 60")
-- Set Tiffin Girls inner area to "Upto 60"
----------------------------------------------------------

ALTER TABLE catchment_definitions
  ADD COLUMN IF NOT EXISTS catchment_alloc_seats_display TEXT;

UPDATE catchment_definitions
SET catchment_alloc_seats_display = 'Upto 60'
WHERE school_id IN (SELECT id FROM schools WHERE name ILIKE '%Tiffin%')
  AND LOWER(TRIM(catchment_key)) = 'inner';
