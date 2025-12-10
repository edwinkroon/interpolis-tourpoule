-- SQL Script to clear all stage_results data and reset ID sequence
-- This will remove all stage results and reset the auto-increment ID counter to 1

-- Option 1: TRUNCATE (recommended - faster and automatically resets sequence)
-- This will remove all data and reset the ID sequence
TRUNCATE TABLE stage_results RESTART IDENTITY;

-- Option 2: If TRUNCATE doesn't work due to foreign key constraints, use DELETE instead:
-- DELETE FROM stage_results;
-- ALTER SEQUENCE stage_results_id_seq RESTART WITH 1;

-- Verify the table is empty
SELECT COUNT(*) as remaining_rows FROM stage_results;
-- Should return: remaining_rows = 0

-- Verify the sequence is reset (next ID will be 1)
-- Note: This will increment the sequence, so we reset it back to 1
SELECT setval('stage_results_id_seq', 1, false);
SELECT currval('stage_results_id_seq') as current_sequence_value;
-- Should return: current_sequence_value = 1

