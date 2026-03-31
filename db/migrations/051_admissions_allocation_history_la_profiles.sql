--------------------------------------------------------------------------------
-- LA secondary allocation profiles (e.g. Buckinghamshire grammar allocation
-- profile XLSX): per school, entry year (September admission year), and
-- ordered offer rounds (March national offer, then reallocation rounds).
--------------------------------------------------------------------------------

ALTER TABLE admissions_allocation_history
  DROP COLUMN IF EXISTS on_time_apps,
  DROP COLUMN IF EXISTS first_pref_apps,
  DROP COLUMN IF EXISTS offers_total,
  DROP COLUMN IF EXISTS last_distance_offered_km,
  DROP COLUMN IF EXISTS notes;

ALTER TABLE admissions_allocation_history
  ADD COLUMN IF NOT EXISTS school_urn TEXT,
  ADD COLUMN IF NOT EXISTS la_slug TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS round_order SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS round_code TEXT NOT NULL DEFAULT 'march_national',
  ADD COLUMN IF NOT EXISTS round_label TEXT,
  ADD COLUMN IF NOT EXISTS profile_heading TEXT,
  ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS data_source_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS statistics_page_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE admissions_allocation_history ALTER COLUMN la_slug DROP DEFAULT;

DROP INDEX IF EXISTS idx_admissions_alloc_school_year;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_alloc_school_year_round
  ON admissions_allocation_history (school_id, entry_year, round_code);

INSERT INTO data_source_refresh_log (
  slug,
  domain,
  title,
  source_urls,
  review_after,
  notes,
  script_hint,
  lineage
)
VALUES (
  'bucks_allocation_profiles_ingest',
  'admissions_allocation',
  'Buckinghamshire Council — secondary allocation profiles → admissions_allocation_history',
  $json$[
    {
      "label": "School place allocation statistics (index page)",
      "url": "https://www.buckinghamshire.gov.uk/schools-and-learning/schools-index/school-admissions/school-admissions-guides-policies-and-statistics/school-place-allocation-statistics/"
    },
    {
      "label": "September 2026 entry — March 2026 allocation profile (FINAL XLSX)",
      "url": "https://www.buckinghamshire.gov.uk/documents/40617/Allocation_Profile_2026_-_FINAL_V2.xlsx"
    },
    {
      "label": "September 2025 entry — March 2025 allocation profile (FINAL XLSX)",
      "url": "https://www.buckinghamshire.gov.uk/documents/36157/Allocation_Profile_2025_-_FINAL.xlsx"
    },
    {
      "label": "September 2025 entry — 2 April 2025 re-allocation (secondary)",
      "url": "https://www.buckinghamshire.gov.uk/documents/37366/Secondary_school_allocations_-_2_April_2025_Re-allocation_Round.xlsx"
    },
    {
      "label": "September 2025 entry — 21 May 2025 second round (secondary)",
      "url": "https://www.buckinghamshire.gov.uk/documents/37365/Secondary_school_allocations_-_21_May_2025_Second_Round.xlsx"
    },
    {
      "label": "September 2024 entry — 1 March 2024 allocation profile (FINAL XLSX)",
      "url": "https://www.buckinghamshire.gov.uk/documents/33847/Allocation_Profile_2024_-_FINAL_rrgfYhf.xlsx"
    },
    {
      "label": "September 2023 entry — 1 March 2023 allocation profile (XLSX)",
      "url": "https://www.buckinghamshire.gov.uk/documents/33846/ALLOCATION_PROFILE_2023__5ua2yRL.xlsx"
    }
  ]$json$::jsonb,
  '2026-09-01',
  $$Each XLSX row under GRAMMAR SCHOOLS is ingested until the UPPER SCHOOLS header. Rounds: march_national, realloc_april, realloc_may (where published). entry_year = September Year 7 admission year.$$,
  'server/scripts/load_admission_allocation_bucks.py',
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  domain = EXCLUDED.domain,
  title = EXCLUDED.title,
  source_urls = EXCLUDED.source_urls,
  review_after = EXCLUDED.review_after,
  notes = EXCLUDED.notes,
  script_hint = EXCLUDED.script_hint,
  updated_at = NOW();
