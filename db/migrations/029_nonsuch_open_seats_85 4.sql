----------------------------------------------------------
-- Nonsuch (school_id=2): Open stream seat allocation = 85 / year.
-- (011 had set all active rows to 125; Open should stay 85 per 012 intent.)
----------------------------------------------------------

UPDATE catchment_definitions
SET catchment_alloc_seats = 85
WHERE school_id = 2
  AND catchment_key = 'Open'
  AND geography_type = 'open';
