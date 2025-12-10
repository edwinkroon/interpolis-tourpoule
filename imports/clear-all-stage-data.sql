-- SQL Script to clear all stage-related data and reset sequences
-- This will remove all stage results, fantasy stage points, and reset ID counters
-- Use this when you want to start fresh and re-import all stages from day 1

-- WARNING: This will delete ALL stage results and points!
-- Make sure you have a backup if needed.

-- Step 1: Clear fantasy_stage_points (depends on stage_results)
TRUNCATE TABLE fantasy_stage_points RESTART IDENTITY;

-- Step 2: Clear stage_results
TRUNCATE TABLE stage_results RESTART IDENTITY;

-- Step 3: Clear stage_jersey_wearers (optional, but recommended for clean start)
TRUNCATE TABLE stage_jersey_wearers RESTART IDENTITY;

-- Verify the tables are empty
SELECT 'fantasy_stage_points' as table_name, COUNT(*) as remaining_rows FROM fantasy_stage_points
UNION ALL
SELECT 'stage_results', COUNT(*) FROM stage_results
UNION ALL
SELECT 'stage_jersey_wearers', COUNT(*) FROM stage_jersey_wearers;

-- Verify the sequences are reset
SELECT setval('fantasy_stage_points_id_seq', 1, false);
SELECT setval('stage_results_id_seq', 1, false);
SELECT setval('stage_jersey_wearers_id_seq', 1, false);

SELECT 'All stage data cleared and sequences reset!' as status;

