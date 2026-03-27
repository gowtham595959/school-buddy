--------------------------------------------------------------------------------
-- Drawer visibility: derive from loaded DfE tables (not hard-coded school ids).
-- Loaders refresh these after ingest; this migration fixes existing databases.
--------------------------------------------------------------------------------

UPDATE schools s
SET has_results_gcse = EXISTS (
  SELECT 1 FROM school_gcse_results g WHERE g.school_id = s.id
);

UPDATE schools s
SET has_results_alevel = EXISTS (
  SELECT 1 FROM school_ks5_results k WHERE k.school_id = s.id
);
