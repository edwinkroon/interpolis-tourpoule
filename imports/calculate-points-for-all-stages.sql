-- SQL Script to manually trigger points calculation for all stages with results
-- This is a helper script - the actual calculation happens in the Netlify function
-- 
-- To use this, you need to call the calculate-stage-points function for each stage
-- via a POST request to /.netlify/functions/calculate-stage-points
-- with body: {"stageId": X}
--
-- Or use this query to get all stage IDs that have results:

SELECT DISTINCT 
  s.id as stage_id,
  s.stage_number,
  s.name as stage_name,
  COUNT(sr.id) as result_count
FROM stages s
JOIN stage_results sr ON s.id = sr.stage_id
GROUP BY s.id, s.stage_number, s.name
ORDER BY s.stage_number;

-- For each stage_id returned above, you need to call:
-- POST /.netlify/functions/calculate-stage-points
-- Body: {"stageId": <stage_id>}

-- Alternative: Check which stages already have points calculated
SELECT 
  s.id as stage_id,
  s.stage_number,
  s.name as stage_name,
  COUNT(DISTINCT sr.id) as result_count,
  COUNT(DISTINCT fsp.id) as points_entries_count
FROM stages s
LEFT JOIN stage_results sr ON s.id = sr.stage_id
LEFT JOIN fantasy_stage_points fsp ON s.id = fsp.stage_id
WHERE sr.id IS NOT NULL
GROUP BY s.id, s.stage_number, s.name
ORDER BY s.stage_number;

-- Stages that need points calculation (have results but no points):
SELECT 
  s.id as stage_id,
  s.stage_number,
  s.name as stage_name,
  COUNT(DISTINCT sr.id) as result_count
FROM stages s
JOIN stage_results sr ON s.id = sr.stage_id
LEFT JOIN fantasy_stage_points fsp ON s.id = fsp.stage_id
WHERE fsp.id IS NULL
GROUP BY s.id, s.stage_number, s.name
ORDER BY s.stage_number;

