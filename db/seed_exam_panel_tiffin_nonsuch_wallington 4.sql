----------------------------------------------------------
-- Tiffin (1), Nonsuch (2), Wallington (3) — compact exam drawer copy.
----------------------------------------------------------

UPDATE schools
SET has_admissions = true, has_exams = true
WHERE id IN (1, 2, 3);

-- Tiffin Girls — 2026 entry
UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  admission_test = true,
  test_authority = 'Tiffin Girls / Kingston' || chr(10) || '(GL Stage 1; school Stage 2)',
  exam_assessment_type = 'GL English & Maths (MCQ), then written English & Maths',
  exam_stages = '[
    {"stage": 1, "subjects": ["English", "Maths"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "3 Jun 2025",
    "application_end": "1 Sep 2025 12:00",
    "stage1_exam": "2–3 Oct 2025",
    "stage1_result": "Mid-Oct 2025",
    "stage2_exam": "8 Nov 2025",
    "offered_day": "2 Mar 2026",
    "accept_deadline": "16 Mar 2026"
  }'::jsonb,
  allocation_snapshot = '{
    "total_applications": "~2,400 (est.)",
    "cleared_stage1": "~480 to Stage 2 (est.)",
    "admissions_offered": 180,
    "cutoff_mark": "Rank-based (no fixed pass mark)"
  }'::jsonb,
  exam_info_url = 'https://www.tiffingirls.org/admissions/year-7/',
  show_exam_notes = true,
  notes = '-'
WHERE school_id = 1 AND entry_year = 2026;

-- Tiffin — 2025 entry
UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  admission_test = true,
  test_authority = 'Tiffin Girls / Kingston' || chr(10) || '(GL Stage 1; school Stage 2)',
  exam_assessment_type = 'GL English & Maths (MCQ), then written English & Maths',
  exam_stages = '[
    {"stage": 1, "subjects": ["English", "Maths"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "Jun 2024",
    "application_end": "Sep 2024",
    "stage1_exam": "Oct 2024",
    "stage2_exam": "Nov 2024",
    "offered_day": "3 Mar 2025"
  }'::jsonb,
  allocation_snapshot = '{
    "total_applications": "~2,300 (est.)",
    "cleared_stage1": "~460 (est.)",
    "admissions_offered": 180
  }'::jsonb,
  exam_info_url = 'https://www.tiffingirls.org/admissions/year-7/',
  show_exam_notes = true,
  notes = '-'
WHERE school_id = 1 AND entry_year = 2025;

-- Nonsuch — 2026
UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  admission_test = true,
  test_authority = 'Sutton grammar schools (SET + NWSSEE with Wallington)',
  exam_assessment_type = 'SET (English & Maths papers), then English & Maths (NWSSEE)',
  exam_stages = '[
    {"stage": 1, "subjects": ["English", "Maths"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "1 May 2025",
    "application_end": "1 Aug 2025",
    "stage1_exam": "16 Sep 2025 (SET)",
    "stage2_exam": "27 Sep 2025 (NWSSEE)",
    "stage2_result": "End Oct 2025",
    "offered_day": "2 Mar 2026"
  }'::jsonb,
  allocation_snapshot = '{
    "total_applications": "~2,600 (est.)",
    "cleared_stage1": "~900 (est.)",
    "admissions_offered": 210
  }'::jsonb,
  exam_info_url = 'https://www.nonsuchschool.org/page/?pid=19&title=Admissions',
  show_exam_notes = true,
  notes = '-'
WHERE school_id = 2 AND entry_year = 2026;

-- Nonsuch — 2025
UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  admission_test = true,
  test_authority = 'Sutton (SET + NWSSEE with Wallington)',
  exam_assessment_type = 'SET (English & Maths), then English & Maths (NWSSEE)',
  exam_stages = '[
    {"stage": 1, "subjects": ["English", "Maths"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "May 2024",
    "application_end": "Aug 2024",
    "stage1_exam": "Sep 2024",
    "stage2_exam": "Sep 2024",
    "offered_day": "Mar 2025"
  }'::jsonb,
  allocation_snapshot = '{
    "total_applications": "~2,500 (est.)",
    "admissions_offered": 210
  }'::jsonb,
  exam_info_url = 'https://www.nonsuchschool.org/page/?pid=19&title=Admissions',
  show_exam_notes = true,
  notes = '-'
WHERE school_id = 2 AND entry_year = 2025;

-- Wallington — 2026
UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  admission_test = true,
  test_authority = 'Sutton grammar schools (SET + NWSSEE with Nonsuch)',
  exam_assessment_type = 'SET (English & Maths papers), then English & Maths (NWSSEE)',
  exam_stages = '[
    {"stage": 1, "subjects": ["English", "Maths"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "1 May 2025",
    "application_end": "1 Aug 2025",
    "stage1_exam": "16 Sep 2025 (SET)",
    "stage2_exam": "27 Sep 2025 (NWSSEE)",
    "stage2_result": "End Oct 2025",
    "offered_day": "2 Mar 2026"
  }'::jsonb,
  allocation_snapshot = '{
    "total_applications": "~2,500 (est.)",
    "cleared_stage1": "~880 (est.)",
    "admissions_offered": 210
  }'::jsonb,
  exam_info_url = 'https://www.wallingtongirls.org.uk/page/?title=Selective+Eligibility+Test+%28SET%29+2025&pid=197',
  show_exam_notes = true,
  notes = '-'
WHERE school_id = 3 AND entry_year = 2026;

-- Wallington — 2025
UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  admission_test = true,
  test_authority = 'Sutton (SET + NWSSEE with Nonsuch)',
  exam_assessment_type = 'SET (English & Maths), then English & Maths (NWSSEE)',
  exam_stages = '[
    {"stage": 1, "subjects": ["English", "Maths"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "May 2024",
    "application_end": "Aug 2024",
    "stage1_exam": "Sep 2024",
    "stage2_exam": "Sep 2024",
    "offered_day": "Mar 2025"
  }'::jsonb,
  allocation_snapshot = '{
    "total_applications": "~2,450 (est.)",
    "admissions_offered": 210
  }'::jsonb,
  exam_info_url = 'https://www.wallingtongirls.org.uk/page/?title=Selective+Eligibility+Test+%28SET%29+2025&pid=197',
  show_exam_notes = true,
  notes = '-'
WHERE school_id = 3 AND entry_year = 2025;
