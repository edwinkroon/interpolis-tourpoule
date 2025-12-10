-- SQL Script to debug why points are not being calculated
-- Run this to check the prerequisites for points calculation

-- 1. Check if scoring_rules exist (REQUIRED)
SELECT '1. Scoring Rules' as check_name, COUNT(*) as count, 
       CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '✗ MISSING - Run insert-scoring-rules.sql' END as status
FROM scoring_rules;

-- 2. Check if there are fantasy_teams (REQUIRED for points > 0)
SELECT '2. Fantasy Teams' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '✗ MISSING - Teams need to be created via UI' END as status
FROM fantasy_teams;

-- 3. Check if there are active fantasy_team_riders (REQUIRED for points > 0)
SELECT '3. Active Team Riders' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '✗ MISSING - Riders need to be added to teams' END as status
FROM fantasy_team_riders
WHERE active = true;

-- 4. Check if there are stage_results (REQUIRED)
SELECT '4. Stage Results' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '✗ MISSING - Import stage results first' END as status
FROM stage_results;

-- 5. Check if there are participants (REQUIRED)
SELECT '5. Participants' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '✗ MISSING' END as status
FROM participants;

-- 6. Check existing fantasy_stage_points (should be populated after calculation)
SELECT '6. Fantasy Stage Points' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) > 0 THEN '✓ OK - Points calculated' ELSE '✗ MISSING - Run calculate-stage-points' END as status
FROM fantasy_stage_points;

-- 7. Check jersey wearers (OPTIONAL - can be empty, just means 0 jersey points)
SELECT '7. Jersey Wearers' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '⚠ OPTIONAL - Empty means 0 jersey points' END as status
FROM stage_jersey_wearers;

-- Detailed breakdown per stage
SELECT 
  s.id as stage_id,
  s.stage_number,
  s.name as stage_name,
  COUNT(DISTINCT sr.id) as result_count,
  COUNT(DISTINCT fsp.id) as points_entries,
  CASE 
    WHEN COUNT(DISTINCT sr.id) > 0 AND COUNT(DISTINCT fsp.id) = 0 THEN '✗ Needs calculation'
    WHEN COUNT(DISTINCT sr.id) > 0 AND COUNT(DISTINCT fsp.id) > 0 THEN '✓ Calculated'
    ELSE '⚠ No results'
  END as status
FROM stages s
LEFT JOIN stage_results sr ON s.id = sr.stage_id
LEFT JOIN fantasy_stage_points fsp ON s.id = fsp.stage_id
GROUP BY s.id, s.stage_number, s.name
ORDER BY s.stage_number;

