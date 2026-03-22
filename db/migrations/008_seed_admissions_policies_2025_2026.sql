----------------------------------------------------------
-- Seed admissions_policies for 2025 and 2026 entry (policy_url, total_intake)
-- Year-dependent: one row per school per entry_year
----------------------------------------------------------

-- Use entry_year for September entry (2025 = Sept 2025, 2026 = Sept 2026)
-- total_intake = Year 7 PAN from school websites

INSERT INTO admissions_policies (school_id, entry_year, year_group, total_intake, policy_url)
SELECT s.id, 2025, 7, total_intake, policy_url
FROM (VALUES
  ('The Tiffin Girls'' School', 180, 'https://www.tiffingirls.org/admissions/'),
  ('Nonsuch High School for Girls', 210, 'https://www.nonsuchschool.org/page/?pid=50&title=Admissions+Policy'),
  ('Wallington High School for Girls', 210, 'https://www.wallingtongirls.org.uk/page/?pid=173&title=Admissions+Policies'),
  ('Gravesend Grammar School', 180, 'https://gravesendgrammar.com/admissions/admission-arrangements'),
  ('Wilson''s School', 186, 'https://www.wilsons.school/admissions-criteria/'),
  ('Aylesbury Grammar School', 186, 'https://www.ags.bucks.sch.uk/admissions/policy/'),
  ('Aylesbury High School', 180, 'https://www.ahs.bucks.sch.uk/page/?pid=27&title=Admissions+policies'),
  ('Beaconsfield High School', 150, 'https://www.beaconsfieldhigh.school/admissions'),
  ('Burnham Grammar School', 150, 'https://www.burnhamgrammar.org.uk/228/admissions'),
  ('Chesham Grammar School', 180, 'https://www.cheshamgrammar.org/5270/admissions'),
  ('Dr Challoner''s Grammar School', 180, 'https://www.challoners.com/c/information/admissions/admissions-policy'),
  ('Dr Challoner''s High School', 180, 'https://www.challonershigh.com/admissions/admissions-process'),
  ('John Hampden Grammar School', 180, 'https://www.jhgs.bucks.sch.uk/739/2025-admissions'),
  ('The Royal Grammar School, High Wycombe', 192, 'https://www.rgshw.com/page/?pid=36&title=Admissions+Policies'),
  ('Royal Latin School', 174, 'https://www.royallatin.org/admissions/'),
  ('Sir Henry Floyd Grammar School', 180, 'https://www.sirhenryfloyd.co.uk/Admissions/'),
  ('Sir William Borlase''s Grammar School', 150, 'https://www.swbgs.com/page/?pid=89&title=Admissions+Policy'),
  ('Wycombe High School', 192, 'https://www.whs.bucks.sch.uk/admissions/'),
  ('Dame Alice Owen''s School', 200, 'https://damealiceowens.herts.sch.uk/admissions/')
) AS v(name, total_intake, policy_url)
JOIN schools s ON s.name = v.name
WHERE NOT EXISTS (SELECT 1 FROM admissions_policies ap WHERE ap.school_id = s.id AND ap.entry_year = 2025);

INSERT INTO admissions_policies (school_id, entry_year, year_group, total_intake, policy_url)
SELECT s.id, 2026, 7, total_intake, policy_url
FROM (VALUES
  ('The Tiffin Girls'' School', 180, 'https://www.tiffingirls.org/admissions/'),
  ('Nonsuch High School for Girls', 210, 'https://www.nonsuchschool.org/page/?pid=50&title=Admissions+Policy'),
  ('Wallington High School for Girls', 210, 'https://www.wallingtongirls.org.uk/page/?pid=173&title=Admissions+Policies'),
  ('Gravesend Grammar School', 180, 'https://gravesendgrammar.com/admissions/admission-arrangements'),
  ('Wilson''s School', 186, 'https://www.wilsons.school/admissions-criteria/'),
  ('Aylesbury Grammar School', 186, 'https://www.ags.bucks.sch.uk/admissions/policy/'),
  ('Aylesbury High School', 180, 'https://www.ahs.bucks.sch.uk/page/?pid=27&title=Admissions+policies'),
  ('Beaconsfield High School', 150, 'https://www.beaconsfieldhigh.school/admissions'),
  ('Burnham Grammar School', 150, 'https://www.burnhamgrammar.org.uk/228/admissions'),
  ('Chesham Grammar School', 180, 'https://www.cheshamgrammar.org/5270/admissions'),
  ('Dr Challoner''s Grammar School', 180, 'https://www.challoners.com/c/information/admissions/admissions-policy'),
  ('Dr Challoner''s High School', 180, 'https://www.challonershigh.com/admissions/admissions-process'),
  ('John Hampden Grammar School', 180, 'https://www.jhgs.bucks.sch.uk/739/2025-admissions'),
  ('The Royal Grammar School, High Wycombe', 192, 'https://www.rgshw.com/page/?pid=36&title=Admissions+Policies'),
  ('Royal Latin School', 174, 'https://www.royallatin.org/admissions/'),
  ('Sir Henry Floyd Grammar School', 180, 'https://www.sirhenryfloyd.co.uk/Admissions/'),
  ('Sir William Borlase''s Grammar School', 150, 'https://www.swbgs.com/page/?pid=89&title=Admissions+Policy'),
  ('Wycombe High School', 192, 'https://www.whs.bucks.sch.uk/admissions/'),
  ('Dame Alice Owen''s School', 200, 'https://damealiceowens.herts.sch.uk/admissions/')
) AS v(name, total_intake, policy_url)
JOIN schools s ON s.name = v.name
WHERE NOT EXISTS (SELECT 1 FROM admissions_policies ap WHERE ap.school_id = s.id AND ap.entry_year = 2026);
