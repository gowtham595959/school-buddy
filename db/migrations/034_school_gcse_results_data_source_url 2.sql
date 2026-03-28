----------------------------------------------------------
-- Official DfE publication URL (Explore Education Statistics) per cohort.
-- cohort_end_year 2025 = academic year 2024/25, etc.
----------------------------------------------------------

ALTER TABLE school_gcse_results
  ADD COLUMN IF NOT EXISTS data_source_url TEXT;

UPDATE school_gcse_results
SET data_source_url = 'https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance/2024-25'
WHERE cohort_end_year = 2025;

UPDATE school_gcse_results
SET data_source_url = 'https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance/2023-24'
WHERE cohort_end_year = 2024;

UPDATE school_gcse_results
SET data_source_url = 'https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance/2022-23'
WHERE cohort_end_year = 2023;
