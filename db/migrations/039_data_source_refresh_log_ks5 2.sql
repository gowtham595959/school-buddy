--------------------------------------------------------------------------------
-- Operational log row: DfE 16–18 / A level ingest (school_ks5_results).
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
