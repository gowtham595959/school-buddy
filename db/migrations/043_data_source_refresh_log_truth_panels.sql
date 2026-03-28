--------------------------------------------------------------------------------
-- data_source_refresh_log: align with actual loaders + GCSE/A level UI data path.
-- Fixes: remove obsolete GCSE information_about_schools + SELECTIVE_ZIP from registry;
-- document that panels read only API → school_gcse_results / school_ks5_results.
-- Idempotent: ON CONFLICT (slug) DO UPDATE.
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
      "label": "Latest 16–18 release — all files ZIP (institution_performance + subject/qual; load_school_ks5_dfe.KS5_RELEASE_ZIP_LATEST)",
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
      "label": "URN scope: DISTINCT TRIM(school_code) FROM schools (non-empty), intersected with DfE rows. Matches load_school_ks5_dfe.fetch_school_urns_from_db — no admissions/selective CSV."
    }
  ]$json$::jsonb,
  '2027-03-01',
  $$043: UI A level panel + drawer header chip load only GET /api/schools/:id/ks5-results → school_ks5_results (see ks5.service.js). Ingest: cohort end years 2023–2025 (load_school_ks5_dfe.py MIN/MAX). Headline row: institution_performance (School, disadvantage Total, exam cohort A level). Grade % cohort 2025: institution_subject_and_qualification_results_* in latest ZIP; cohort 2024: all_inst_data “All subjects” in 2023/24 ZIP; cohort 2023 often blank. Per-row Source link: school_ks5_results.data_source_url. After each DfE drop, verify ZIP UUIDs and CSV paths.$$,
  'server/scripts/load_school_ks5_dfe.py',
  $lineage${
    "publisher": "Department for Education, A level and other 16 to 18 results (Explore Education Statistics)",
    "trust_summary": "school_ks5_results is built from official DfE CSVs only. Headline metrics copy institution_performance cells. % A* / A*/A / A*/A/B (of GCE A level exam entries) are computed in the loader: latest ZIP subject/qual file for cohort 2025, all_inst_data from the 2023/24 publication ZIP for cohort 2024; cohort 2023 may lack a matching open file. APS is not re-derived from raw marks.",
    "db_table": "school_ks5_results",
    "api_endpoint": "GET /api/schools/:id/ks5-results",
    "api_to_db": "client/src/v2/components/drawer/AlevelResultsPanel.jsx + useKs5Results → server/src/routes/schools.js → server/src/domains/ks5/ks5.service.js SELECT → school_ks5_results only (no DfE fetch in browser). SchoolDetailDrawer header chip uses the same hook and API.",
    "cohort_years_loaded": "2023–2025 (performance rows); grade-band columns may be null for cohort 2023.",
    "row_filter": "geographic_level=School, disadvantage_status=Total, exam_cohort=A level",
    "urn_scope": "All schools with schools.school_code set; loader keeps rows whose URN appears in DfE institution files.",
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
        "trust_note": "Shown in UI; end1618_student_count is also in DB but not used as the main Students included cell."
      },
      {
        "panel_label": "% A* grades / % A* or A / % A*, A or B",
        "db_columns": ["alevel_entries_pct_grade_astar", "alevel_entries_pct_grade_astar_a", "alevel_entries_pct_grade_astar_a_b", "alevel_exam_entries_denominator"],
        "ingest_logic": "Entries-based (not pupils). Cohort 2025: sum GCE A level grade lines A*, A, B and Total exam entries across subjects in institution_subject_and_qualification_results_*.csv. Cohort 2024: all_inst_data School, A level, GCE A level, subject All subjects, grade_total_entries *, A, B, Total. Cohort 2023: often no file → null.",
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
        "trust_note": "UI shows aab_percent; aab_student_count is in API/DB but not a separate table row in the panel."
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
      "label": "2024/25 release — all files ZIP — load_school_gcse_dfe.RELEASES[2025][0]",
      "url": "https://content.explore-education-statistics.service.gov.uk/api/releases/4e06e0e2-d705-462c-bb99-97afa166928c/files"
    },
    {
      "label": "2023/24 release — all files ZIP — load_school_gcse_dfe.RELEASES[2024][0]",
      "url": "https://content.explore-education-statistics.service.gov.uk/api/releases/b76a938a-7875-4542-af20-0b23ecb99a49/files"
    },
    {
      "label": "School headline table (2024/25 ZIP)",
      "path_in_zip": "data/202425_performance_tables_schools_revised.csv"
    },
    {
      "label": "Subject exam entries & grades (2024/25 ZIP)",
      "path_in_zip": "data/202425_subject_school_all_exam_entriesgrades_revised.csv"
    },
    {
      "label": "School headline table (2023/24 ZIP)",
      "path_in_zip": "data/202324_performance_tables_schools_final.csv"
    },
    {
      "label": "Subject exam entries & grades (2023/24 ZIP)",
      "path_in_zip": "data/202324_subject_school_all_exam_entriesgrades_final.csv"
    },
    {
      "label": "URN scope: DISTINCT TRIM(school_code) FROM schools (non-empty), intersected with DfE headline/subject rows. load_school_gcse_dfe.py does NOT read information_about_schools (no selective CSV filter)."
    }
  ]$json$::jsonb,
  '2026-10-15',
  $$043: UI GCSE panel + drawer header chip load only GET /api/schools/:id/gcse-results → school_gcse_results (gcse.service.js). source_urls list only files the loader uses. Yearly: update RELEASES + SUBJECT paths + DATA_SOURCE_URL_BY_COHORT_END_YEAR in load_school_gcse_dfe.py; rerun; bump review_after. 2022/23 headline optional --extra-csv-cohort3.$$,
  'server/scripts/load_school_gcse_dfe.py',
  $lineage${
    "publisher": "Department for Education (DfE), accredited official statistics via Explore Education Statistics",
    "trust_summary": "GCSE drawer numeric fields come from PostgreSQL school_gcse_results, filled only from DfE CSVs in official EES ZIPs. Loader-derived (not raw copy): (1) grade-band % from summed subject exam-entries counts, (2) engmath_7_plus_percent when headline has no combined 7+ (independence estimate — see lineage row). Static explanatory text in the panel is React copy; la_name is from the table.",
    "db_table": "school_gcse_results",
    "api_endpoint": "GET /api/schools/:id/gcse-results",
    "api_to_db": "client/src/v2/components/drawer/GcseResultsPanel.jsx + useGcseResults → server/src/routes/schools.js → server/src/domains/gcse/gcse.service.js SELECT → school_gcse_results only (no DfE fetch in browser). SchoolDetailDrawer header chip uses the same hook and API.",
    "loader_constants": {
      "RELEASES_2025_ZIP": "4e06e0e2-d705-462c-bb99-97afa166928c",
      "RELEASES_2024_ZIP": "b76a938a-7875-4542-af20-0b23ecb99a49",
      "SUBJECT_SCHOOL_EXAM_ENTRIES_GRADES": {
        "2025": "data/202425_subject_school_all_exam_entriesgrades_revised.csv",
        "2024": "data/202324_subject_school_all_exam_entriesgrades_final.csv"
      }
    },
    "school_scope": "URNs from schools.school_code that appear in DfE headline CSV for that cohort (England rows in those files).",
    "headline_row_filter": "One row per school per cohort: breakdown_topic/breakdown/sex/prior_attainment/mobility/first_language=Total; disadvantage Total (column name differs 2023/24 vs 2024/25).",
    "rows": [
      {
        "panel_label": "Source of Data — link",
        "db_column": "data_source_url",
        "source": "Loader sets from cohort_end_year → EES landing URL.",
        "trust_note": "Same publication family as the CSVs."
      },
      {
        "panel_label": "Pupils Included",
        "db_column": "pupil_count",
        "source_file": "performance_tables_schools_*.csv (headline)",
        "dfe_fields": "pupil_count (2024/25); t_pupils (2023/24)",
        "trust_note": "Official DfE pupil count for headline filters."
      },
      {
        "panel_label": "Grade 9 / Gr 8–9 / Gr 7–9 / Gr 6–9 (%)",
        "db_columns": ["gcse_entries_pct_grade_9", "gcse_entries_pct_grade_8_9", "gcse_entries_pct_grade_7_9", "gcse_entries_pct_grade_6_9"],
        "denominator_column": "gcse_exam_entries_denominator",
        "source_file": "subject_school_all_exam_entriesgrades_*.csv",
        "ingest_logic": "Sum GCSE (9-1) Full Course + Double Award rows per URN; denominator = Total exam entries; % = grade count ÷ denominator × 100.",
        "trust_note": "Entries-based; KS4 technical guide defines included qualifications."
      },
      {
        "panel_label": "Attainment 8 (Average)",
        "db_column": "attainment8_average",
        "source_file": "performance_tables_schools_*.csv",
        "dfe_fields": "attainment8_average (2024/25); avg_att8 (2023/24)",
        "trust_note": "Copied from headline; not recomputed."
      },
      {
        "panel_label": "Grade 7+ English & Maths (%)",
        "db_column": "engmath_7_plus_percent",
        "source_file": "subject file estimate or headline if DfE publishes combined 7+",
        "ingest_logic": "If headline engmath_73_percent exists, store. Else independence product from Maths + English Language shares of entries at 7–9.",
        "trust_note": "Indicative when estimated; UI states this."
      },
      {
        "panel_label": "Grade 5+ English & Maths (%)",
        "db_column": "engmath_95_percent",
        "dfe_fields": "engmath_95_percent (2024/25); pt_l2basics_95 (2023/24)",
        "trust_note": "Official headline."
      },
      {
        "panel_label": "Entering EBacc (%)",
        "db_column": "ebacc_entering_percent",
        "dfe_fields": "ebacc_entering_percent (2024/25); pt_ebacc_e_ptq_ee (2023/24)",
        "trust_note": "Official headline."
      },
      {
        "panel_label": "EBacc Average Point Score",
        "db_column": "ebacc_aps_average",
        "dfe_fields": "ebacc_aps_average (2024/25); avg_ebaccaps (2023/24)",
        "trust_note": "Official headline."
      },
      {
        "panel_label": "Progress 8 (+ 95% CI)",
        "db_columns": ["progress8_average", "progress8_lower_95_ci", "progress8_upper_95_ci"],
        "dfe_fields": "progress8_* (2024/25); avg_p8score, p8score_ci_low, p8score_ci_upp (2023/24)",
        "trust_note": "UI shows Not published for z/x/c."
      },
      {
        "panel_label": "Grade 4+ English & Maths (%)",
        "db_column": "engmath_94_percent",
        "dfe_fields": "engmath_94_percent (2024/25); pt_l2basics_94 (2023/24)",
        "trust_note": "Official headline."
      },
      {
        "panel_label": "5+ GCSEs at 4+ (incl. English & Maths) (%)",
        "db_column": "gcse_five_engmath_percent",
        "dfe_fields": "gcse_five_engmath_percent (2024/25); pt_5em_94 (2023/24)",
        "trust_note": "Official headline."
      },
      {
        "panel_label": "GCSE grades 9–1 (pupils) (%)",
        "db_column": "gcse_91_percent",
        "dfe_fields": "gcse_91_percent (2024/25); may be null 2023/24",
        "trust_note": "Official headline where present."
      },
      {
        "panel_label": "More you can compare (popover)",
        "db_columns": ["la_name"],
        "trust_note": "Blurb text is static JSX; la_name in popover from table."
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
