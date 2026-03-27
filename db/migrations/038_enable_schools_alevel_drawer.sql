----------------------------------------------------------
-- Show A level results section for schools that show GCSE results (grammar set).
----------------------------------------------------------

UPDATE schools
SET has_results_alevel = true
WHERE has_results_gcse IS true;
