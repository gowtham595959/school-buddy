--------------------------------------------------------------------------------
-- School-reported Oxbridge offer counts (not DfE). Optional integer + source URL.
--------------------------------------------------------------------------------

ALTER TABLE schools ADD COLUMN IF NOT EXISTS oxbridge_offers INTEGER;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS source_url_oxbridge_offers TEXT;

COMMENT ON COLUMN schools.oxbridge_offers IS 'Latest school-reported count of Oxford/Cambridge places or offers; NULL if not published.';
COMMENT ON COLUMN schools.source_url_oxbridge_offers IS 'Official school page backing the Oxbridge figure (or best official destination/sixth-form page if count unknown).';

-- Verified counts where the source page states a figure for ~2025 entry / leavers.
-- Others: NULL count with an official reference URL.

UPDATE schools SET oxbridge_offers = 15, source_url_oxbridge_offers = 'https://www.tiffingirls.org/academic/sixth-form/'
WHERE id = 1;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.nonsuchschool.org/page/?pid=113&title=Applying+for+Oxbridge'
WHERE id = 2;

UPDATE schools SET oxbridge_offers = 11, source_url_oxbridge_offers = 'https://www.wallingtongirls.org.uk/news/?nid=1&pid=3&storyid=200'
WHERE id = 3;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.gravesendgrammar.com/about/pupil-destinations'
WHERE id = 6;

UPDATE schools SET oxbridge_offers = 37, source_url_oxbridge_offers = 'https://www.wilsons.school/oxbridge-offers-received/'
WHERE id = 7;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.ags.bucks.sch.uk/ags-news/'
WHERE id = 8;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.ahs.bucks.sch.uk/page/?pid=142&title=Next+Steps'
WHERE id = 9;

UPDATE schools SET oxbridge_offers = 6, source_url_oxbridge_offers = 'https://beaconsfieldhigh.bucks.sch.uk/sixth-form-tools/a-level-results'
WHERE id = 10;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.burnhamgrammar.org.uk/'
WHERE id = 11;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.cheshamgrammar.org/4956/leavers-destinations'
WHERE id = 12;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.challoners.com/Leavers-Destinations/'
WHERE id = 13;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.challonershigh.com/sixth-form/sixth-form-leaver-s-destinations'
WHERE id = 14;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://jhgs.bucks.sch.uk/23/sixth-form'
WHERE id = 15;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.rgshw.com/news/?nid=1&pid=3&storyid=547'
WHERE id = 16;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.royallatin.org/apply-for-sixth-form/'
WHERE id = 17;

UPDATE schools SET oxbridge_offers = 10, source_url_oxbridge_offers = 'https://www.sirhenryfloyd.co.uk/Examinations/'
WHERE id = 18;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.swbgs.com/'
WHERE id = 19;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://www.whs.bucks.sch.uk/impressive-a-level-success-for-wycombe-high-schools-class-of-2025/'
WHERE id = 20;

UPDATE schools SET oxbridge_offers = NULL, source_url_oxbridge_offers = 'https://damealiceowens.herts.sch.uk/sixth-form/higher-education/'
WHERE id = 21;
