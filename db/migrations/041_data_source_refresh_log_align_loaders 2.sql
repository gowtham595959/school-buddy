--------------------------------------------------------------------------------
-- Refresh data_source_refresh_log rows to match load_school_gcse_dfe.py and
-- load_school_ks5_dfe.py (URLs, ZIP IDs, CSV paths, drawer/lineage mapping).
-- Idempotent: ON CONFLICT (slug) DO UPDATE.
-- New databases: docker-compose runs this after 036/039 (see 16-data-source…).
--------------------------------------------------------------------------------

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
  'dfe_ks5_16_18_alevel_ingest',
  'ks5_alevel',
  'DfE 16–18 (A level cohort) — school_ks5_results loader',
  $json$[
    {
      "label": "A level and other 16–18 results 2024/25 — landing page",
      "url": "https://explore-education-statistics.service.gov.uk/find-statistics/a-level-and-other-16-to-18-results/2024-25"
    },
    {
      "label": "A level and other 16–18 results 2023/24 — landing page",
      "url": "https://explore-education-statistics.service.gov.uk/find-statistics/a-level-and-other-16-to-18-results/2023-24"
    },
    {
      "label": "A level and other 16–18 results 2022/23 — landing page",
      "url": "https://explore-education-statistics.service.gov.uk/find-statistics/a-level-and-other-16-to-18-results/2022-23"
    },
    {
      "label": "Latest 16–18 release — all files ZIP (institution_performance + subject/qual; KS5_RELEASE_ZIP_LATEST)",
      "url": "https://content.explore-education-statistics.service.gov.uk/api/releases/915999c1-8e2b-412c-811b-272c2f0dcf48/files"
    },
    {
      "label": "2023/24 publication — all files ZIP (all_inst_data; KS5_RELEASE_ZIP_2023_24_PUBLICATION)",
      "url": "https://content.explore-education-statistics.service.gov.uk/api/releases/19157c8c-c75f-4bef-ba68-c3dd3b6d1d96/files"
    },
    {
      "label": "Institution performance (multi-year; inside latest ZIP)",
      "path_in_zip": "data/institution_performance_202225.csv"
    },
    {
      "label": "Institution subject & qualification results (latest ZIP; cohort end 2025 typical)",
      "path_in_zip": "data/institution_subject_and_qualification_results_202425.csv"
    },
    {
      "label": "all_inst_data (2023/24 ZIP; cohort end 2024 / time_period 202324)",
      "path_in_zip": "data/all_inst_data.csv"
    },
    {
      "label": "URN scope: DISTINCT schools.school_code in the app DB (intersected with DfE CSV rows; no admissions-policy CSV filter)"
    }
  ]$json$::jsonb,
  '2027-03-01',
  $$Ingest loads cohort end years 2023–2025 only (MIN/MAX in server/scripts/load_school_ks5_dfe.py). Headline row per year from latest ZIP institution_performance (School, disadvantage Total, exam cohort A level). Entry-grade % rows: cohort 2025 from institution_subject_and_qualification_results_* in latest ZIP; cohort 2024 from all_inst_data “All subjects” (*, A, B, Total) in 2023/24 publication ZIP; cohort 2023 often has no school-level subject/all_inst bundle in these releases—cells may be blank. Per-row “Source of Data” URLs: school_ks5_results.data_source_url from DATA_SOURCE_URL_BY_COHORT_END_YEAR in the loader. After each DfE publication, verify ZIP release IDs and CSV paths; rerun loader.$$,
  'server/scripts/load_school_ks5_dfe.py',
  $lineage${
    "publisher": "Department for Education, A level and other 16 to 18 results (Explore Education Statistics)",
    "trust_summary": "school_ks5_results is built from official DfE CSVs only. Headline metrics copy institution_performance cells. % A* / A*/A / A*/A/B (of GCE A level exam entries) are computed in the loader: latest ZIP subject/qual file for cohort 2025, all_inst_data from the 2023/24 publication ZIP for cohort 2024; cohort 2023 may lack a matching open file. APS is not re-derived from raw marks.",
    "db_table": "school_ks5_results",
    "api_endpoint": "GET /api/schools/:id/ks5-results",
    "cohort_years_loaded": "2023–2025 (performance rows); grade-band columns may be null for cohort 2023.",
    "row_filter": "geographic_level=School, disadvantage_status=Total, exam_cohort=A level",
    "urn_scope": "All schools with schools.school_code set; loader keeps rows whose school_urn appears in the institution/school DfE files. Includes partially selective and other England types DfE publishes in the same tables.",
    "loader_constants": {
      "KS5_RELEASE_ZIP_LATEST": "915999c1-8e2b-412c-811b-272c2f0dcf48",
      "KS5_RELEASE_ZIP_2023_24_PUBLICATION": "19157c8c-c75f-4bef-ba68-c3dd3b6d1d96",
      "INSTITUTION_PERFORMANCE_CSV": "data/institution_performance_202225.csv",
      "ALL_INST_DATA_CSV": "data/all_inst_data.csv"
    },
    "rows": [
      {
        "panel_label": "Source of Data — link",
        "db_column": "data_source_url",
        "source": "Loader maps cohort_end_year to Explore landing URL (DATA_SOURCE_URL_BY_COHORT_END_YEAR).",
        "trust_note": "Same GOV.UK publication family as the CSVs."
      },
      {
        "panel_label": "Students included (drawer)",
        "db_column": "aps_per_entry_student_count",
        "dfe_field": "aps_per_entry_student_count",
        "trust_note": "DfE count underpinning APS per entry; drawer label is parent-friendly. Column end1618_student_count is also loaded but not shown as the main headline row."
      },
      {
        "panel_label": "% A* grades / % A* or A / % A*, A or B",
        "db_columns": ["alevel_entries_pct_grade_astar", "alevel_entries_pct_grade_astar_a", "alevel_entries_pct_grade_astar_a_b", "alevel_exam_entries_denominator"],
        "ingest_logic": "Entries-based (not pupils). Cohort 2025: sum GCE A level grade lines A*, A, B and Total exam entries across subjects in institution_subject_and_qualification_results_*.csv. Cohort 2024: all_inst_data.csv School, A level, GCE A level, subject All subjects, grade_total_entries *, A, B, Total. Cohort 2023: often no file in current ZIP set → null.",
        "trust_note": "Denominator is counted A level exam entries; methodology in DfE 16–18 technical guide for that year."
      },
      {
        "panel_label": "Average points / Average grade",
        "db_columns": ["aps_per_entry", "aps_per_entry_grade"],
        "dfe_fields": "aps_per_entry, aps_per_entry_grade",
        "source_file": "institution_performance (headline row)",
        "trust_note": "Official DfE headline fields."
      },
      {
        "panel_label": "Average points (best 3) / Average grade (best 3)",
        "db_columns": ["best_three_alevels_aps", "best_three_alevels_grade", "best_three_alevels_student_count"],
        "source_file": "institution_performance",
        "trust_note": "Official DfE best-three measures."
      },
      {
        "panel_label": "AAB or better",
        "db_columns": ["aab_percent", "aab_student_count"],
        "source_file": "institution_performance",
        "trust_note": "Official DfE AAB rule for that cohort."
      },
      {
        "panel_label": "Stayed for second year / Stayed and were assessed",
        "db_columns": ["retained_percent", "retained_assessed_percent", "retained_student_count"],
        "source_file": "institution_performance",
        "trust_note": "Official DfE retention fields."
      },
      {
        "panel_label": "Progress / Progress band",
        "db_columns": ["value_added", "value_added_lower_ci", "value_added_upper_ci", "progress_banding"],
        "source_file": "institution_performance",
        "trust_note": "A level value added and banding; UI maps z/x/c to Not published where applicable."
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


-- GCSE row: align script reference + trust note for entry-grade aggregation (unchanged URLs).
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
      "label": "2024/25 release — all files ZIP (API) — RELEASES[2025][0]",
      "url": "https://content.explore-education-statistics.service.gov.uk/api/releases/4e06e0e2-d705-462c-bb99-97afa166928c/files"
    },
    {
      "label": "2023/24 release — all files ZIP (API) — RELEASES[2024][0]",
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
  $$Yearly maintenance: when DfE publishes the next KS4 cohort, update RELEASES, SUBJECT_SCHOOL_EXAM_ENTRIES_GRADES, and DATA_SOURCE_URL_BY_COHORT_END_YEAR in server/scripts/load_school_gcse_dfe.py; rerun loader; bump review_after. 2022/23 school headline is not in the standard bundle — optional --extra-csv-cohort3. GCSE drawer “Source of Data” uses school_gcse_results.data_source_url.$$,
  'server/scripts/load_school_gcse_dfe.py',
  $lineage${
    "publisher": "Department for Education (DfE), accredited official statistics via Explore Education Statistics",
    "trust_summary": "All numeric values in the GCSE Results drawer are read from PostgreSQL table school_gcse_results, populated only from DfE open CSVs inside the official EES release ZIPs (not third-party league tables). The app does not compute headline metrics except: (1) high-grade percentages from summed counts in the subject exam-entries file, (2) an approximate joint Grade 7+ English & Mathematics percentage when DfE does not publish that combined headline — see that row’s lineage.",
    "db_table": "school_gcse_results",
    "api_endpoint": "GET /api/schools/:id/gcse-results",
    "loader_constants": {
      "RELEASES_2025_ZIP": "4e06e0e2-d705-462c-bb99-97afa166928c",
      "RELEASES_2024_ZIP": "b76a938a-7875-4542-af20-0b23ecb99a49",
      "SELECTIVE_ZIP": "4e06e0e2-d705-462c-bb99-97afa166928c",
      "SUBJECT_SCHOOL_EXAM_ENTRIES_GRADES": {
        "2025": "data/202425_subject_school_all_exam_entriesgrades_revised.csv",
        "2024": "data/202324_subject_school_all_exam_entriesgrades_final.csv"
      }
    },
    "school_scope": "Rows for URNs in schools.school_code that appear in the DfE headline CSV for that cohort (England institutions in those files).",
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
