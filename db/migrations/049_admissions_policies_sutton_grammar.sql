--------------------------------------------------------------------------------
-- Sutton Grammar School (school_id 22) — Year 7 admissions / 11+ exam details.
-- Sources (official):
--   https://www.suttongrammar.sutton.sch.uk/admissions/  (key dates 2026/2027)
--   https://www.suttongrammar.sutton.sch.uk/admissions/faqs/  (SET + shared stage 2)
-- Published intake figure (Year 7): 150 boys — headmaster welcome,
--   https://www.suttongrammar.sutton.sch.uk/
--------------------------------------------------------------------------------

INSERT INTO admissions_policies (
  school_id,
  entry_year,
  year_group,
  school_name,
  total_intake,
  policy_url,
  exam_info_url,
  admission_test,
  test_authority,
  exam_assessment_type,
  exam_stages,
  key_dates,
  notes,
  show_exam_details,
  show_exam_dates,
  show_exam_notes,
  show_stage_allocation,
  allocation_snapshot
)
VALUES
(
  22,
  2026,
  7,
  'Sutton Grammar School',
  150,
  'https://www.suttongrammar.sutton.sch.uk/wp-content/uploads/2025/12/Sutton-Grammar-School-Admissions-Policy-Year-7-entry-2026-determined.pdf',
  'https://www.suttongrammar.sutton.sch.uk/admissions/faqs/',
  true,
  'Sutton selective schools (shared SET); boys'' second stage shared with Wilson''s School & Wallington County Grammar School',
  'SET (multiple-choice English & Maths), then shared second stage English & Maths (written; not multiple choice)',
  '[
    {"stage": 1, "subjects": ["English", "Maths"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  '{
    "application_start": "1 May 2025",
    "application_end": "1 Aug 2025 (midnight; school FAQs)",
    "stage1_exam": "16 Sep 2025 (SET)",
    "stage1_result": "Outcome email in the week after the SET (school FAQs)",
    "stage2_exam": "4 Oct 2025 (shared second stage — school FAQs)",
    "stage2_result": "By end Oct 2025 (school FAQs; before CAF)",
    "offered_day": "2 Mar 2026 (National Offer Day — school Admissions page)",
    "appeal_deadline": "15 Apr 2026 (school Admissions page)"
  }'::jsonb,
  'Access arrangement evidence via primary SENCO: by 13 June 2025 (2026 entry). Single online SET registration covers all participating schools. Common Application Form (CAF) deadline 31 Oct 2025 — your home local authority (school FAQs). Oversubscription: passing tests does not guarantee an offer (school Admissions page).',
  true,
  true,
  true,
  false,
  NULL
),
(
  22,
  2027,
  7,
  'Sutton Grammar School',
  150,
  'https://www.suttongrammar.sutton.sch.uk/wp-content/uploads/2026/02/Sutton-Grammar-School-Admissions-Policy-Year-7-entry-2027-Determined-.pdf',
  'https://www.suttongrammar.sutton.sch.uk/admissions/',
  true,
  'Sutton selective schools (shared SET); boys'' second stage shared with Wilson''s School & Wallington County Grammar School',
  'SET (multiple-choice English & Maths), then shared second stage English & Maths (written; not multiple choice)',
  '[
    {"stage": 1, "subjects": ["English", "Maths"]},
    {"stage": 2, "subjects": ["English", "Maths"]}
  ]'::jsonb,
  '{
    "application_start": "1 May 2026",
    "application_end": "31 Jul 2026 (school Admissions page)",
    "stage1_exam": "15 Sep 2026 (SET — school Admissions page)",
    "stage2_exam": "3 Oct 2026 (Stage 2 — school Admissions page)",
    "open_evening": "23 Sep 2026 (Year 7 Open Evening — school Admissions page)"
  }'::jsonb,
  '2027-entry test dates and registration window are from the school Admissions page “SET Year 7 – 2027 Entry” table. National Offer Day / appeals for 2027 entry: not listed there — confirm on the school site or local authority. For exam format (SET + shared boys'' stage 2), see Admissions FAQs for the same entry year.',
  true,
  true,
  true,
  false,
  NULL
)
ON CONFLICT (school_id, entry_year) DO UPDATE SET
  year_group = EXCLUDED.year_group,
  school_name = EXCLUDED.school_name,
  total_intake = EXCLUDED.total_intake,
  policy_url = EXCLUDED.policy_url,
  exam_info_url = EXCLUDED.exam_info_url,
  admission_test = EXCLUDED.admission_test,
  test_authority = EXCLUDED.test_authority,
  exam_assessment_type = EXCLUDED.exam_assessment_type,
  exam_stages = EXCLUDED.exam_stages,
  key_dates = EXCLUDED.key_dates,
  notes = EXCLUDED.notes,
  show_exam_details = EXCLUDED.show_exam_details,
  show_exam_dates = EXCLUDED.show_exam_dates,
  show_exam_notes = EXCLUDED.show_exam_notes,
  show_stage_allocation = EXCLUDED.show_stage_allocation,
  allocation_snapshot = EXCLUDED.allocation_snapshot,
  updated_at = NOW();
