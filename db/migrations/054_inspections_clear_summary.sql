--------------------------------------------------------------------------------
-- Inspections: narrative summaries are not shown in the app; clear stored prose.
--------------------------------------------------------------------------------

UPDATE inspections SET summary = '' WHERE COALESCE(TRIM(summary), '') <> '';

COMMENT ON COLUMN inspections.summary IS
  'Reserved — not exposed by the inspections API or drawer UI; use report_url.';
