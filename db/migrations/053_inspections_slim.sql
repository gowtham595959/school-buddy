--------------------------------------------------------------------------------
-- Inspections: core Ofsted (England) summary aligned with schools table;
-- drop unused legacy columns.
--------------------------------------------------------------------------------

ALTER TABLE inspections DROP COLUMN IF EXISTS inspector;
ALTER TABLE inspections DROP COLUMN IF EXISTS rating;
ALTER TABLE inspections DROP COLUMN IF EXISTS notes;

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS school_urn TEXT,
  ADD COLUMN IF NOT EXISTS establishment_url TEXT;

UPDATE inspections i
SET
  school_name = s.name,
  school_urn = COALESCE(i.school_urn, s.school_code, ''),
  establishment_url = COALESCE(
    i.establishment_url,
    'https://get-information-schools.service.gov.uk/Establishments/Establishment/Details/' || TRIM(s.school_code)
  )
FROM schools s
WHERE s.id = i.school_id
  AND (i.school_name IS NULL OR i.school_urn IS NULL OR TRIM(COALESCE(i.school_urn, '')) = '');

ALTER TABLE inspections ALTER COLUMN school_name SET NOT NULL;
ALTER TABLE inspections ALTER COLUMN school_urn SET NOT NULL;

COMMENT ON TABLE inspections IS
  'England: Ofsted (and optional bodies in inspection_body). report_url = Ofsted provider page; establishment_url = GIAS.';

COMMENT ON COLUMN inspections.report_url IS
  'Official Ofsted provider page for this URN (e.g. reports.ofsted.gov.uk/provider/23/{URN}).';

COMMENT ON COLUMN inspections.establishment_url IS
  'DfE Get Information about Schools establishment record (verification + related links).';
