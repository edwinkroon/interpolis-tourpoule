-- Fix stage dates - add 1 day to correct timezone issue
UPDATE stages SET date = date + INTERVAL '1 day' WHERE stage_number <= 23;

-- Verify
SELECT stage_number, name, date FROM stages ORDER BY stage_number;

