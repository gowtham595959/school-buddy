----------------------------------------------------------
-- Add fees columns to schools (for XLS bulk import later)
----------------------------------------------------------
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS fees TEXT,
  ADD COLUMN IF NOT EXISTS fees_notes TEXT;
