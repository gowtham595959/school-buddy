----------------------------------------------------------
-- Grade 7+ English & mathematics (combined): not in DfE headline
-- school CSV alongside 5+/4+; populated by loader from subject file
-- (approximate joint estimate — see app copy). Nullable until loaded.
----------------------------------------------------------

ALTER TABLE school_gcse_results
  ADD COLUMN IF NOT EXISTS engmath_7_plus_percent NUMERIC(8, 2);
