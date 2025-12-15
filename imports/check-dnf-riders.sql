-- Check if teams had DNF riders (Cattaneo Mattia or Haig Jack) and verify reserve activation
-- Run this after importing stage results to verify the automatic reserve activation worked

-- QUICK CHECK: Simple query to see if these riders were in teams
SELECT 
  p.team_name,
  r.first_name || ' ' || r.last_name as rider_name,
  ftr.slot_type,
  ftr.active as is_active,
  ls.stage_number as latest_stage,
  CASE 
    WHEN sr.time_seconds IS NULL THEN 'DNF'
    ELSE 'Finished'
  END as stage_status
FROM fantasy_team_riders ftr
JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
JOIN participants p ON ft.participant_id = p.id
JOIN riders r ON ftr.rider_id = r.id
JOIN (SELECT id, stage_number FROM stages ORDER BY stage_number DESC LIMIT 1) ls ON 1=1
LEFT JOIN stage_results sr ON sr.rider_id = r.id AND sr.stage_id = ls.id
WHERE (LOWER(TRIM(r.first_name)) LIKE '%mattia%' AND LOWER(TRIM(r.last_name)) LIKE '%cattaneo%')
   OR (LOWER(TRIM(r.first_name)) LIKE '%jack%' AND LOWER(TRIM(r.last_name)) LIKE '%haig%')
ORDER BY p.team_name, ftr.slot_type;

-- First, find the rider IDs for these riders
SELECT 
  r.id as rider_id,
  r.first_name,
  r.last_name,
  tp.name as team_name
FROM riders r
LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
WHERE (LOWER(TRIM(r.first_name)) LIKE '%mattia%' AND LOWER(TRIM(r.last_name)) LIKE '%cattaneo%')
   OR (LOWER(TRIM(r.first_name)) LIKE '%jack%' AND LOWER(TRIM(r.last_name)) LIKE '%haig%')
ORDER BY r.last_name, r.first_name;

-- Check which teams had these riders and their status
WITH target_riders AS (
  SELECT id
  FROM riders
  WHERE (LOWER(first_name) = 'mattia' AND LOWER(last_name) = 'cattaneo')
     OR (LOWER(first_name) = 'jack' AND LOWER(last_name) = 'haig')
),
latest_stage AS (
  SELECT id, stage_number, name
  FROM stages
  ORDER BY stage_number DESC
  LIMIT 1
)
SELECT 
  p.id as participant_id,
  p.team_name,
  p.user_id,
  r.first_name || ' ' || r.last_name as rider_name,
  ftr.slot_type,
  ftr.slot_number,
  ftr.active,
  sr.position,
  sr.time_seconds,
  CASE 
    WHEN sr.time_seconds IS NULL THEN 'DNF'
    ELSE 'Finished'
  END as status,
  ls.stage_number as latest_stage_number,
  ls.name as latest_stage_name
FROM fantasy_team_riders ftr
JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
JOIN participants p ON ft.participant_id = p.id
JOIN riders r ON ftr.rider_id = r.id
JOIN target_riders tr ON r.id = tr.id
LEFT JOIN latest_stage ls ON 1=1
LEFT JOIN stage_results sr ON sr.rider_id = r.id AND sr.stage_id = ls.id
ORDER BY p.team_name, ftr.slot_type, ftr.slot_number;

-- Check if reserves were activated for teams with DNF riders
WITH target_riders AS (
  SELECT id
  FROM riders
  WHERE (LOWER(first_name) = 'mattia' AND LOWER(last_name) = 'cattaneo')
     OR (LOWER(first_name) = 'jack' AND LOWER(last_name) = 'haig')
),
latest_stage AS (
  SELECT id, stage_number
  FROM stages
  ORDER BY stage_number DESC
  LIMIT 1
),
teams_with_dnf AS (
  SELECT DISTINCT ft.id as fantasy_team_id, ft.participant_id
  FROM fantasy_team_riders ftr
  JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
  JOIN target_riders tr ON ftr.rider_id = tr.id
  JOIN latest_stage ls ON 1=1
  JOIN stage_results sr ON sr.rider_id = ftr.rider_id AND sr.stage_id = ls.id
  WHERE ftr.slot_type = 'main'
    AND sr.time_seconds IS NULL
)
SELECT 
  p.team_name,
  COUNT(CASE WHEN ftr.slot_type = 'main' AND ftr.active = true THEN 1 END) as active_main_riders,
  COUNT(CASE WHEN ftr.slot_type = 'main' AND ftr.active = false THEN 1 END) as inactive_main_riders,
  COUNT(CASE WHEN ftr.slot_type = 'reserve' AND ftr.active = true THEN 1 END) as active_reserve_riders,
  COUNT(CASE WHEN ftr.slot_type = 'reserve' AND ftr.active = false THEN 1 END) as inactive_reserve_riders,
  CASE 
    WHEN COUNT(CASE WHEN ftr.slot_type = 'main' AND ftr.active = true THEN 1 END) = 10 THEN '✓ 10 main riders'
    WHEN COUNT(CASE WHEN ftr.slot_type = 'main' AND ftr.active = true THEN 1 END) < 10 
     AND COUNT(CASE WHEN ftr.slot_type = 'reserve' AND ftr.active = true THEN 1 END) = 0 THEN '⚠ Less than 10, no reserves left'
    ELSE '⚠ Less than 10, but has reserves available'
  END as status
FROM teams_with_dnf twd
JOIN fantasy_teams ft ON twd.fantasy_team_id = ft.id
JOIN participants p ON ft.participant_id = p.id
JOIN fantasy_team_riders ftr ON ftr.fantasy_team_id = ft.id
GROUP BY p.team_name, p.id
ORDER BY p.team_name;
