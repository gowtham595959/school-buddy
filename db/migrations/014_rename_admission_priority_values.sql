-- Update admission_priority values to clearer terminology
-- 'Highest mark' -> 'Exam score first'
-- 'Closest distance' -> 'Distance first'
UPDATE catchment_definitions
SET admission_priority = 'Exam score first'
WHERE admission_priority = 'Highest mark';

UPDATE catchment_definitions
SET admission_priority = 'Distance first'
WHERE admission_priority = 'Closest distance';
