----------------------------------------------------------
-- 11+ exam drawer data for schools 6–21 (19 schools in DB).
-- Based on official school / council pages (Bucks STT, Kent Test, Sutton SET, etc.).
-- Re-run safe: overwrites exam_* columns on matching rows.
-- See: https://www.buckinghamshire.gov.uk/schools-and-learning/schools-index/school-admissions/grammar-schools-and-transfer-testing-11/
----------------------------------------------------------

UPDATE schools SET has_admissions = true, has_exams = true
WHERE id IN (6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21);

-- ========== Kent: Gravesend Grammar (6) ==========
UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  show_exam_notes = true,
  admission_test = true,
  test_authority = 'Kent County Council — Kent PESE (11+)',
  exam_assessment_type = 'GL Assessment: reasoning paper, then English & maths paper (Kent Test layout)',
  exam_stages = '[
    {"stage": 1, "subjects": ["Verbal reasoning", "Spatial reasoning", "Non-verbal reasoning"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "Jun 2025",
    "application_end": "Jul 2025",
    "registration_deadline": "Jul 2025 — confirm on KCC site",
    "stage1_exam": "Sept 2025 (Kent Test dates)",
    "stage1_result": "Mid-Oct 2025",
    "offered_day": "2 Mar 2026"
  }'::jsonb,
  allocation_snapshot = jsonb_build_object(
    'admissions_offered', total_intake,
    'total_applications', 'Oversubscribed — priority areas apply (see policy)'
  ),
  exam_info_url = 'https://www.gravesendgrammar.com/admissions/year-7-admissions',
  notes = '-'
WHERE school_id = 6 AND entry_year = 2026;

UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  show_exam_notes = true,
  admission_test = true,
  test_authority = 'Kent County Council — Kent PESE (11+)',
  exam_assessment_type = 'GL Assessment: reasoning paper, then English & maths paper (Kent Test layout)',
  exam_stages = '[
    {"stage": 1, "subjects": ["Verbal reasoning", "Spatial reasoning", "Non-verbal reasoning"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "Jun 2024",
    "application_end": "Jul 2024",
    "stage1_exam": "Sept 2024",
    "stage1_result": "Oct 2024",
    "offered_day": "Mar 2025"
  }'::jsonb,
  allocation_snapshot = jsonb_build_object(
    'admissions_offered', total_intake,
    'total_applications', 'Oversubscribed — priority areas apply (see policy)'
  ),
  exam_info_url = 'https://www.gravesendgrammar.com/admissions/year-7-admissions',
  notes = '-'
WHERE school_id = 6 AND entry_year = 2025;

-- ========== Sutton: Wilson''s (7) ==========
UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  show_exam_notes = true,
  admission_test = true,
  test_authority = 'Sutton grammar schools (SET + boys'' second stage with Sutton Grammar & Wallington County Grammar)',
  exam_assessment_type = 'SET (English & Maths papers), then shared second stage English & Maths',
  exam_stages = '[
    {"stage": 1, "subjects": ["English", "Maths"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "1 May 2025",
    "application_end": "1 Aug 2025",
    "stage1_exam": "Sept 2025 (SET — confirm invitational date)",
    "stage2_exam": "Oct 2025 (shared second stage — confirm on school site)",
    "stage2_result": "End Oct 2025",
    "offered_day": "2 Mar 2026"
  }'::jsonb,
  allocation_snapshot = jsonb_build_object(
    'admissions_offered', total_intake,
    'total_applications', '~3,500+ (est.) — highly competitive'
  ),
  exam_info_url = 'https://www.wilsons.school/year-7-applying-for-a-place/',
  notes = '-'
WHERE school_id = 7 AND entry_year = 2026;

UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  show_exam_notes = true,
  admission_test = true,
  test_authority = 'Sutton (SET + boys'' second stage with Sutton Grammar & Wallington County Grammar)',
  exam_assessment_type = 'SET (English & Maths), then shared second stage English & Maths',
  exam_stages = '[
    {"stage": 1, "subjects": ["English", "Maths"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "May 2024",
    "application_end": "Aug 2024",
    "stage1_exam": "Sept 2024 (SET)",
    "stage2_exam": "Oct 2024",
    "offered_day": "Mar 2025"
  }'::jsonb,
  allocation_snapshot = jsonb_build_object(
    'admissions_offered', total_intake,
    'total_applications', 'Competitive — see Wilson''s admissions'
  ),
  exam_info_url = 'https://www.wilsons.school/year-7-applying-for-a-place/',
  notes = '-'
WHERE school_id = 7 AND entry_year = 2025;

-- ========== Buckinghamshire grammar schools: shared Secondary Transfer Test ==========
UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  show_exam_notes = true,
  admission_test = true,
  test_authority = 'Buckinghamshire Council — Secondary Transfer Test (GL Assessment)',
  exam_assessment_type = 'Two papers same day: English comprehension, maths, verbal skills & non-verbal skills (see Bucks CC booklet)',
  exam_stages = '[
    {"stage": 1, "subjects": ["English", "Maths", "Verbal skills", "Non-verbal skills"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "1 May 2025",
    "application_end": "26 Jun 2025 — confirm on Bucks CC site",
    "stage1_exam": "Early Sept 2025 (practice + main test dates on Bucks CC)",
    "stage1_result": "Mid-Oct 2025 (standardised scores)",
    "offered_day": "2 Mar 2026"
  }'::jsonb,
  allocation_snapshot = jsonb_build_object(
    'admissions_offered', total_intake,
    'total_applications', 'Typically oversubscribed — see school admissions policy'
  ),
  notes = '-',
  exam_info_url = CASE school_id
    WHEN 8 THEN 'https://www.ags.bucks.sch.uk/admissions/policy/'
    WHEN 9 THEN 'https://www.ahs.bucks.sch.uk/page/?pid=27&title=Admissions+policies'
    WHEN 10 THEN 'https://www.beaconsfieldhigh.school/admissions'
    WHEN 11 THEN 'https://www.burnhamgrammar.org.uk/228/admissions'
    WHEN 12 THEN 'https://www.cheshamgrammar.org/5270/admissions'
    WHEN 13 THEN 'https://www.challoners.com/c/information/admissions/admissions-policy'
    WHEN 14 THEN 'https://www.challonershigh.com/admissions/admissions-process'
    WHEN 15 THEN 'https://www.jhgs.bucks.sch.uk/739/2025-admissions'
    WHEN 16 THEN 'https://www.rgshw.com/page/?pid=36&title=Admissions+Policies'
    WHEN 17 THEN 'https://www.royallatin.org/admissions/'
    WHEN 18 THEN 'https://www.sirhenryfloyd.co.uk/Admissions/'
    WHEN 19 THEN 'https://www.swbgs.com/page/?pid=89&title=Admissions+Policy'
    WHEN 20 THEN 'https://www.whs.bucks.sch.uk/admissions/'
  END
WHERE school_id IN (8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20) AND entry_year = 2026;

UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  show_exam_notes = true,
  admission_test = true,
  test_authority = 'Buckinghamshire Council — Secondary Transfer Test (GL Assessment)',
  exam_assessment_type = 'Two papers same day: English comprehension, maths, verbal skills & non-verbal skills (see Bucks CC booklet)',
  exam_stages = '[
    {"stage": 1, "subjects": ["English", "Maths", "Verbal skills", "Non-verbal skills"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "Jun 2024",
    "application_end": "Jun 2024 — confirm on Bucks CC site",
    "stage1_exam": "Sept 2024",
    "stage1_result": "Oct 2024",
    "offered_day": "Mar 2025"
  }'::jsonb,
  allocation_snapshot = jsonb_build_object(
    'admissions_offered', total_intake,
    'total_applications', 'Typically oversubscribed — see school admissions policy'
  ),
  notes = '-',
  exam_info_url = CASE school_id
    WHEN 8 THEN 'https://www.ags.bucks.sch.uk/admissions/policy/'
    WHEN 9 THEN 'https://www.ahs.bucks.sch.uk/page/?pid=27&title=Admissions+policies'
    WHEN 10 THEN 'https://www.beaconsfieldhigh.school/admissions'
    WHEN 11 THEN 'https://www.burnhamgrammar.org.uk/228/admissions'
    WHEN 12 THEN 'https://www.cheshamgrammar.org/5270/admissions'
    WHEN 13 THEN 'https://www.challoners.com/c/information/admissions/admissions-policy'
    WHEN 14 THEN 'https://www.challonershigh.com/admissions/admissions-process'
    WHEN 15 THEN 'https://www.jhgs.bucks.sch.uk/739/2025-admissions'
    WHEN 16 THEN 'https://www.rgshw.com/page/?pid=36&title=Admissions+Policies'
    WHEN 17 THEN 'https://www.royallatin.org/admissions/'
    WHEN 18 THEN 'https://www.sirhenryfloyd.co.uk/Admissions/'
    WHEN 19 THEN 'https://www.swbgs.com/page/?pid=89&title=Admissions+Policy'
    WHEN 20 THEN 'https://www.whs.bucks.sch.uk/admissions/'
  END
WHERE school_id IN (8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20) AND entry_year = 2025;

-- ========== Hertfordshire: Dame Alice Owen''s (21) — partial selection ==========
UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  show_exam_notes = true,
  admission_test = true,
  test_authority = 'Dame Alice Owen''s / GL Assessment (Part 1)',
  exam_assessment_type = 'Part 1: verbal reasoning (GL). Part 2 (invite): English & maths — priority area required for selective places',
  exam_stages = '[
    {"stage": 1, "subjects": ["Verbal reasoning"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "1 May 2025",
    "application_end": "12 Jun 2025 — confirm on school site",
    "stage1_exam": "Sept 2025 (Part 1 — school calendar)",
    "stage2_exam": "Sept 2025 (Part 2, invited)",
    "stage1_result": "Mid-Oct 2025",
    "offered_day": "2 Mar 2026"
  }'::jsonb,
  allocation_snapshot = jsonb_build_object(
    'admissions_offered', total_intake,
    'selective_places', '65 academic places (remainder non-selective intake — see policy)',
    'total_applications', 'Very high demand within priority areas'
  ),
  exam_info_url = 'https://damealiceowens.herts.sch.uk/test/',
  notes = '-'
WHERE school_id = 21 AND entry_year = 2026;

UPDATE admissions_policies SET
  show_exam_details = true,
  show_exam_dates = true,
  show_stage_allocation = true,
  show_exam_notes = true,
  admission_test = true,
  test_authority = 'Dame Alice Owen''s / GL Assessment (Part 1)',
  exam_assessment_type = 'Part 1: verbal reasoning (GL). Part 2 (invite): English & maths — priority area required for selective places',
  exam_stages = '[
    {"stage": 1, "subjects": ["Verbal reasoning"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  key_dates = '{
    "application_start": "May 2024",
    "application_end": "Jun 2024",
    "stage1_exam": "Sept 2024",
    "stage2_exam": "Sept 2024",
    "offered_day": "Mar 2025"
  }'::jsonb,
  allocation_snapshot = jsonb_build_object(
    'admissions_offered', total_intake,
    'selective_places', '65 academic places (see policy)',
    'total_applications', 'Very high demand within priority areas'
  ),
  exam_info_url = 'https://damealiceowens.herts.sch.uk/test/',
  notes = '-'
WHERE school_id = 21 AND entry_year = 2025;
