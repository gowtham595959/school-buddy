-- Set fees and fees_notes for Tiffin Girls, Nonsuch, Wallington
-- State grammar schools: no tuition fees

UPDATE schools SET fees = 'No fees (state funded)', fees_notes = NULL
WHERE id = 1 AND (fees IS NULL OR fees = '');

UPDATE schools SET fees = 'No fees (state funded)', fees_notes = NULL
WHERE id = 2 AND (fees IS NULL OR fees = '');

UPDATE schools SET fees = 'No fees (state funded)', fees_notes = NULL
WHERE id = 3 AND (fees IS NULL OR fees = '');
