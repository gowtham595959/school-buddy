--------------------------------------------------------------------------------
-- Operational registry: where data came from, when to refresh, and lineage
-- for explaining trustworthiness (links, loaders, DB columns, DfE file roles).
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS data_source_refresh_log (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  domain          TEXT,
  title           TEXT NOT NULL,
  source_urls     JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_after    DATE,
  last_run_at     TIMESTAMPTZ,
  notes           TEXT,
  script_hint     TEXT,
  lineage         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_source_refresh_log_domain
  ON data_source_refresh_log (domain);

COMMENT ON TABLE data_source_refresh_log IS
  'Links, refresh cadence, notes, and ingest lineage for datasets (e.g. DfE KS4).';

COMMENT ON COLUMN data_source_refresh_log.source_urls IS
  'JSON array of {label, url?} and/or {label, path_in_zip} for artifacts.';

COMMENT ON COLUMN data_source_refresh_log.lineage IS
  'Structured mapping: UI labels -> school_gcse_results columns -> DfE CSV roles (trust narrative).';


-- DfE Key Stage 4 / GCSE → school_gcse_results (selective schools ingest)
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
  'dfe_ks4_gcse_school_ingest',
  'ks4_gcse',
  'DfE Key Stage 4 GCSE — school_gcse_results loader',
  $json$[
    {
      "label": "KS4 performance 2024/25 — Explore Education Statistics (landing page)",
      "url": "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance/2024-25"
    },
    {
      "label": "KS4 performance 2023/24 — Explore Education Statistics (landing page)",
      "url": "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance/2023-24"
    },
    {
      "label": "KS4 performance 2022/23 — Explore Education Statistics (landing page)",
      "url": "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance/2022-23"
    },
    {
      "label": "2024/25 release — all files ZIP (API)",
      "url": "https://content.explore-education-statistics.service.gov.uk/api/releases/4e06e0e2-d705-462c-bb99-97afa166928c/files"
    },
    {
      "label": "2023/24 release — all files ZIP (API)",
      "url": "https://content.explore-education-statistics.service.gov.uk/api/releases/b76a938a-7875-4542-af20-0b23ecb99a49/files"
    },
    {
      "label": "School headline table (2024/25, inside 2024/25 ZIP)",
      "path_in_zip": "data/202425_performance_tables_schools_revised.csv"
    },
    {
      "label": "Subject exam entries & grades (2024/25, inside 2024/25 ZIP)",
      "path_in_zip": "data/202425_subject_school_all_exam_entriesgrades_revised.csv"
    },
    {
      "label": "School information — selective URN filter (2024/25 ZIP, provisional)",
      "path_in_zip": "data/202425_information_about_schools_provisional.csv"
    },
    {
      "label": "School headline table (2023/24, inside 2023/24 ZIP)",
      "path_in_zip": "data/202324_performance_tables_schools_final.csv"
    },
    {
      "label": "Subject exam entries & grades (2023/24, inside 2023/24 ZIP)",
      "path_in_zip": "data/202324_subject_school_all_exam_entriesgrades_final.csv"
    }
  ]$json$::jsonb,
  '2026-10-15',
  $$Yearly maintenance: when DfE publishes the next Key Stage 4 cohort (new ZIP + new CSV paths under data/), update RELEASES / SUBJECT_SCHOOL_EXAM_ENTRIES_GRADES / DATA_SOURCE_URL_BY_COHORT_END_YEAR in server/scripts/load_school_gcse_dfe.py, rerun the loader, and add a new data_source_refresh_log row or update review_after. The 2022/23 school headline file is not in the standard bundle — optional --extra-csv-cohort3. GCSE panel link per school year comes from school_gcse_results.data_source_url (set at load time).$$,
  'server/scripts/load_school_gcse_dfe.py',
  $lineage${
    "publisher": "Department for Education (DfE), accredited official statistics via Explore Education Statistics",
    "trust_summary": "All numeric values in the GCSE Results drawer are read from PostgreSQL table school_gcse_results, populated only from DfE open CSVs inside the official EES release ZIPs (not third-party league tables). The app does not compute headline metrics except: (1) high-grade percentages from summed counts in the subject exam-entries file, (2) an approximate joint Grade 7+ English & Mathematics percentage when DfE does not publish that combined headline — see that row’s lineage.",
    "db_table": "school_gcse_results",
    "api_endpoint": "GET /api/schools/:id/gcse-results",
    "school_scope": "Rows are loaded only for URNs listed as selective (non-independent) in information_about_schools (2024/25 provisional file), intersected with schools present in headline CSVs.",
    "headline_row_filter": "One row per school per cohort: breakdown_topic=Total, breakdown=Total, sex=Total, prior_attainment=Total, mobility=Total, first_language=Total; disadvantage field Total (column name differs 2023/24 vs 2024/25).",
    "rows": [
      {
        "panel_label": "Source of Data — link",
        "db_column": "data_source_url",
        "source": "Set in loader from cohort_end_year → human EES URL (not scraped from school page).",
        "trust_note": "Same GOV.UK publication family as the CSVs; users can verify methodology on Explore Education Statistics."
      },
      {
        "panel_label": "Pupils Included",
        "db_column": "pupil_count",
        "source_file": "performance_tables_schools_*.csv (headline)",
        "dfe_fields": "pupil_count (2024/25 layout); t_pupils (2023/24 layout)",
        "trust_note": "Official DfE published pupil count for the headline cohort filters."
      },
      {
        "panel_label": "Grade 9 / Gr 8–9 / Gr 7–9 / Gr 6–9 (%)",
        "db_columns": ["gcse_entries_pct_grade_9", "gcse_entries_pct_grade_8_9", "gcse_entries_pct_grade_7_9", "gcse_entries_pct_grade_6_9"],
        "denominator_column": "gcse_exam_entries_denominator",
        "source_file": "subject_school_all_exam_entriesgrades_*.csv",
        "ingest_logic": "For each school URN, sum GCSE (9-1) Full Course and Full Course (Double Award) rows where grade is Total exam entries (denominator), and grades 6/7/8/9 counts; percentages = count/denominator×100. Entries-based, not pupil headcount.",
        "trust_note": "Figures are aggregations of the same DfE subject file cells the department publishes; methodology for which qualifications count is in the KS4 technical guide for that year."
      },
      {
        "panel_label": "Attainment 8 (Average)",
        "db_column": "attainment8_average",
        "source_file": "performance_tables_schools_*.csv",
        "dfe_fields": "attainment8_average (2024/25); avg_att8 (2023/24)",
        "trust_note": "Direct DfE headline school value; not recomputed in our loader."
      },
      {
        "panel_label": "Grade 7+ English & Maths (%)",
        "db_column": "engmath_7_plus_percent",
        "source_file": "subject_school_all_exam_entriesgrades_*.csv (estimate); headline CSV if DfE adds engmath_73_percent",
        "ingest_logic": "If headline supplies engmath_73_percent, store it. Otherwise estimate: for Mathematics and English Language only, share of entries at grades 7–9 ÷ total entries per subject, then multiply (independence assumption). Documented as indicative in the UI.",
        "trust_note": "Only non–copy-paste metric: still sourced from DfE counts but combined by us; DfE publishes combined 5+ and 4+ in headlines, not 7+ both in the same table."
      },
      {
        "panel_label": "Grade 5+ English & Maths (%)",
        "db_column": "engmath_95_percent",
        "source_file": "performance_tables_schools_*.csv",
        "dfe_fields": "engmath_95_percent (2024/25); pt_l2basics_95 (2023/24)",
        "trust_note": "Official DfE headline percentage (pupil-based combined threshold)."
      },
      {
        "panel_label": "Entering EBacc (%)",
        "db_column": "ebacc_entering_percent",
        "dfe_fields": "ebacc_entering_percent (2024/25); pt_ebacc_e_ptq_ee (2023/24)",
        "trust_note": "Official DfE headline."
      },
      {
        "panel_label": "EBacc Average Point Score",
        "db_column": "ebacc_aps_average",
        "dfe_fields": "ebacc_aps_average (2024/25); avg_ebaccaps (2023/24)",
        "trust_note": "Official DfE headline."
      },
      {
        "panel_label": "Progress 8 (+ 95% CI)",
        "db_columns": ["progress8_average", "progress8_lower_95_ci", "progress8_upper_95_ci"],
        "dfe_fields": "progress8_* (2024/25); avg_p8score, p8score_ci_low, p8score_ci_upp (2023/24)",
        "trust_note": "Official DfE values; UI shows Not published for z/x/c or non-numeric suppression codes."
      },
      {
        "panel_label": "Grade 4+ English & Maths (%)",
        "db_column": "engmath_94_percent",
        "dfe_fields": "engmath_94_percent (2024/25); pt_l2basics_94 (2023/24)",
        "trust_note": "Official DfE headline (standard pass / Level 2 basics combined)."
      },
      {
        "panel_label": "5+ GCSEs at 4+ (incl. English & Maths) (%)",
        "db_column": "gcse_five_engmath_percent",
        "dfe_fields": "gcse_five_engmath_percent (2024/25); pt_5em_94 (2023/24)",
        "trust_note": "Official DfE headline."
      },
      {
        "panel_label": "GCSE grades 9–1 (pupils) (%)",
        "db_column": "gcse_91_percent",
        "dfe_fields": "gcse_91_percent (2024/25); absent in 2023/24 headline layout → null in DB for that cohort unless mapped later",
        "trust_note": "Official DfE headline where present; inclusion rules in KS4 methodology."
      },
      {
        "panel_label": "More you can compare (popover)",
        "db_columns": ["la_name"],
        "source_file": "performance_tables_schools_*.csv headline row la_name",
        "trust_note": "Explanatory copy in the app is not stored in DB; LA name for context is from headline CSV."
      }
    ]
  }$lineage$::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  domain        = EXCLUDED.domain,
  title         = EXCLUDED.title,
  source_urls   = EXCLUDED.source_urls,
  review_after  = EXCLUDED.review_after,
  notes         = EXCLUDED.notes,
  script_hint   = EXCLUDED.script_hint,
  lineage       = EXCLUDED.lineage,
  updated_at    = NOW();
