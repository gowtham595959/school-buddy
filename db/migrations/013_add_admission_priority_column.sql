-- Add admission_priority column to catchment_definitions
-- Values: 'Highest mark', 'Closest distance', etc.
ALTER TABLE catchment_definitions
ADD COLUMN IF NOT EXISTS admission_priority text;

-- Set 'Highest mark' for Nonsuch (school_id=2) and Wallington (school_id=3)
UPDATE catchment_definitions
SET admission_priority = 'Highest mark'
WHERE school_id IN (2, 3)
  AND catchment_active = true;
