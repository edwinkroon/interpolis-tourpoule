-- SQL Script to check riders import status
-- Run this to see how many riders are in the database and what might be missing

-- Count total riders in database
SELECT COUNT(*) as total_riders_in_db FROM riders;

-- Count riders per team
SELECT 
  tp.name as team_name,
  COUNT(r.id) as rider_count
FROM teams_pro tp
LEFT JOIN riders r ON r.team_pro_id = tp.id
GROUP BY tp.name
ORDER BY rider_count DESC, tp.name;

-- Show riders that might have import issues (no team match)
SELECT 
  r.id,
  r.first_name,
  r.last_name,
  r.team_pro_id,
  'No team match' as issue
FROM riders r
WHERE r.team_pro_id IS NULL;

-- Check for potential duplicates (same first and last name)
SELECT 
  first_name,
  last_name,
  COUNT(*) as count
FROM riders
GROUP BY first_name, last_name
HAVING COUNT(*) > 1;

-- Show all riders with their teams
SELECT 
  r.id,
  r.first_name,
  r.last_name,
  tp.name as team_name,
  r.nationality
FROM riders r
LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
ORDER BY r.last_name, r.first_name;

