-- SQL Script to import stage_results for Tour de France 2025
-- IMPORTANT: Make sure stages are imported first using import-stages-2025.sql
-- IMPORTANT: Make sure riders are imported first using import-riders.sql

-- This script inserts stage winners and top positions based on available Tour de France 2025 results
-- Note: Full results for all 184 riders per stage are not available in the search results
-- You may need to supplement this with complete results from official sources

-- Stage 1: Lille - Lille (185 km) - Winner: Jasper Philipsen
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 1
  AND r.first_name = 'Jasper' AND r.last_name = 'Philipsen'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 2: Lauwin-Planque - Boulogne-sur-Mer (212 km) - Winner: Mathieu van der Poel
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 2
  AND r.first_name = 'Mathieu' AND r.last_name = 'van der Poel'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 3: Valenciennes - Dunkerque (178 km) - Winner: Tim Merlier
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 3
  AND r.first_name = 'Tim' AND r.last_name = 'Merlier'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 5: Caen - Caen (33 km ITT) - Winner: Tadej Pogačar
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 5
  AND r.first_name = 'Tadej' AND r.last_name = 'Pogačar'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 6: Bayeux - Vire Normandie (201 km) - Winner: Ben Healy
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 6
  AND r.first_name = 'Ben' AND r.last_name = 'Healy'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 9: Chinon - Châteauroux (170 km) - Winner: Tim Merlier
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 9
  AND r.first_name = 'Tim' AND r.last_name = 'Merlier'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 10: Ennezat - Le Mont-Dore Puy de Sancy (163 km) - Winner: Simon Yates
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 10
  AND r.first_name = 'Simon' AND r.last_name = 'Yates'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 12: Auch - Hautacam (180.6 km) - Winner: Tadej Pogačar
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 12
  AND r.first_name = 'Tadej' AND r.last_name = 'Pogačar'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 15: Muret - Carcassonne - Winner: Tim Wellens
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 15
  AND r.first_name = 'Tim' AND r.last_name = 'Wellens'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 16: Montpellier - Mont Ventoux (171.5 km) - Winner: Valentin Paret Peintre
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 16
  AND r.first_name = 'Valentin' AND r.last_name = 'Paret Peintre'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 19: - La Plagne - Winner: Thymen Arensman
-- Note: Thymen Arensman might not be in the riders table, you may need to add him or use a different identifier
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 19
  AND r.first_name = 'Thymen' AND r.last_name = 'Arensman'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 20: - Winner: Kaden Groves
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 20
  AND r.first_name = 'Kaden' AND r.last_name = 'Groves'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Stage 21: Mantes-la-Ville - Paris (132.3 km) - Winner: Wout van Aert
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  1 as position,
  NULL as time_seconds,
  NULL as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = 21
  AND r.first_name = 'Wout' AND r.last_name = 'van Aert'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position;

-- Verify the import
SELECT 
  s.stage_number,
  s.name as stage_name,
  s.date,
  r.first_name || ' ' || r.last_name as winner_name,
  sr.position
FROM stages s
INNER JOIN stage_results sr ON s.id = sr.stage_id
INNER JOIN riders r ON sr.rider_id = r.id
WHERE s.date >= '2025-07-01' AND s.date <= '2025-07-31'
  AND sr.position = 1
ORDER BY s.stage_number;
