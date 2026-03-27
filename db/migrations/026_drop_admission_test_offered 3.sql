----------------------------------------------------------
-- Remove legacy column admission_test_offered (replaced by exam_assessment_type).
----------------------------------------------------------

ALTER TABLE admissions_policies
  ADD COLUMN IF NOT EXISTS exam_assessment_type TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admissions_policies'
      AND column_name = 'admission_test_offered'
  ) THEN
    UPDATE admissions_policies ap
    SET exam_assessment_type = COALESCE(
      NULLIF(TRIM(ap.exam_assessment_type), ''),
      ap.admission_test_offered
    )
    WHERE ap.admission_test_offered IS NOT NULL
      AND (ap.exam_assessment_type IS NULL OR TRIM(ap.exam_assessment_type) = '');

    ALTER TABLE admissions_policies DROP COLUMN admission_test_offered;
  END IF;
END $$;
