-- SQL Script to check if everything is set up correctly for points calculation

-- 1. Check if scoring_rules exist
SELECT 'Scoring Rules' as check_type, COUNT(*) as count FROM scoring_rules;
SELECT rule_type, condition_json, points FROM scoring_rules ORDER BY rule_type, points DESC;

-- 2. Check if there are fantasy_teams with riders
SELECT 'Fantasy Teams' as check_type, COUNT(*) as count FROM fantasy_teams;
SELECT 'Fantasy Team Riders' as check_type, COUNT(*) as count FROM fantasy_team_riders WHERE active = true;

-- 3. Check if there are stage_results
SELECT 'Stage Results' as check_type, COUNT(*) as count FROM stage_results;
SELECT stage_id, COUNT(*) as result_count 
FROM stage_results 
GROUP BY stage_id 
ORDER BY stage_id;

-- 4. Check if there are participants
SELECT 'Participants' as check_type, COUNT(*) as count FROM participants;

-- 5. Check existing fantasy_stage_points
SELECT 'Fantasy Stage Points' as check_type, COUNT(*) as count FROM fantasy_stage_points;
SELECT stage_id, COUNT(*) as participant_count, 
       SUM(points_stage) as total_stage_points,
       SUM(points_jerseys) as total_jersey_points
FROM fantasy_stage_points 
GROUP BY stage_id 
ORDER BY stage_id;

-- 6. Check if there are jersey wearers
SELECT 'Jersey Wearers' as check_type, COUNT(*) as count FROM stage_jersey_wearers;
SELECT sjw.stage_id, j.type as jersey_type, COUNT(*) as count
FROM stage_jersey_wearers sjw
JOIN jerseys j ON sjw.jersey_id = j.id
GROUP BY sjw.stage_id, j.type
ORDER BY sjw.stage_id, j.type;

