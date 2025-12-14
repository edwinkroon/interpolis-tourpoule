-- SQL Script to clear stage results and all points tables
-- This will reset the database as if the first stage hasn't happened yet
-- 
-- Run with: node imports/run-sql-script.js imports/clear-stage-results-and-points.sql

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Clearing stage results and points tables...';
  RAISE NOTICE '========================================';
END $$;

-- Clear in correct order (respecting foreign key constraints)

-- 1. Clear cumulative points (depends on stages)
TRUNCATE TABLE fantasy_cumulative_points RESTART IDENTITY CASCADE;

-- 2. Clear stage points (depends on stages and participants)
TRUNCATE TABLE fantasy_stage_points RESTART IDENTITY CASCADE;

-- 3. Clear stage jersey wearers (depends on stages, jerseys, and riders)
TRUNCATE TABLE stage_jersey_wearers RESTART IDENTITY CASCADE;

-- 4. Clear stage results (depends on stages and riders)
TRUNCATE TABLE stage_results RESTART IDENTITY CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✓ All stage results and points tables cleared';
  RAISE NOTICE '';
  RAISE NOTICE 'The following tables have been cleared:';
  RAISE NOTICE '  - stage_results';
  RAISE NOTICE '  - fantasy_stage_points';
  RAISE NOTICE '  - fantasy_cumulative_points';
  RAISE NOTICE '  - stage_jersey_wearers';
  RAISE NOTICE '';
  RAISE NOTICE 'The database is now ready as if the first stage has not happened yet.';
END $$;

-- Verify the tables are empty
SELECT 
  'stage_results' as table_name,
  COUNT(*) as row_count
FROM stage_results
UNION ALL
SELECT 
  'fantasy_stage_points' as table_name,
  COUNT(*) as row_count
FROM fantasy_stage_points
UNION ALL
SELECT 
  'fantasy_cumulative_points' as table_name,
  COUNT(*) as row_count
FROM fantasy_cumulative_points
UNION ALL
SELECT 
  'stage_jersey_wearers' as table_name,
  COUNT(*) as row_count
FROM stage_jersey_wearers
ORDER BY table_name;

