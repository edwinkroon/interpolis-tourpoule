-- Fix fantasy_team_riders: Set correct slot_type and active status
-- Should be: 10 main (active=true), 5 reserve (active=false)
-- Currently: All main, 10 inactive, 5 active (wrong)
-- 
-- Run with: node imports/run-sql-script.js imports/fix-fantasy-team-riders-slot-and-active.sql

DO $$
DECLARE
  team_record RECORD;
  rider_count INT;
  main_count INT;
  reserve_count INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixing fantasy_team_riders slot_type and active status...';
  RAISE NOTICE '========================================';

  -- Loop through each fantasy team
  FOR team_record IN 
    SELECT DISTINCT ft.id as fantasy_team_id
    FROM fantasy_teams ft
    ORDER BY ft.id
  LOOP
    -- Count total riders for this team
    SELECT COUNT(*) INTO rider_count
    FROM fantasy_team_riders
    WHERE fantasy_team_id = team_record.fantasy_team_id;

    IF rider_count = 15 THEN
      -- First, reset all slot_numbers to avoid unique constraint violations
      -- Use temporary negative values to break any existing constraints
      UPDATE fantasy_team_riders
      SET slot_number = -id
      WHERE fantasy_team_id = team_record.fantasy_team_id;

      -- Update first 10 riders: main, active = true, slot_number 1-10
      UPDATE fantasy_team_riders ftr
      SET 
        slot_type = 'main',
        active = true,
        slot_number = sub.slot_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as slot_num
        FROM fantasy_team_riders
        WHERE fantasy_team_id = team_record.fantasy_team_id
        ORDER BY id ASC
        LIMIT 10
      ) sub
      WHERE ftr.id = sub.id;

      -- Update last 5 riders: reserve, active = false, slot_number 1-5
      UPDATE fantasy_team_riders ftr
      SET 
        slot_type = 'reserve',
        active = false,
        slot_number = sub.slot_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as slot_num
        FROM fantasy_team_riders
        WHERE fantasy_team_id = team_record.fantasy_team_id
        ORDER BY id ASC
        OFFSET 10
        LIMIT 5
      ) sub
      WHERE ftr.id = sub.id;

      -- Verify the fix
      SELECT 
        COUNT(*) INTO main_count
      FROM fantasy_team_riders
      WHERE fantasy_team_id = team_record.fantasy_team_id
        AND slot_type = 'main' AND active = true;
      
      SELECT 
        COUNT(*) INTO reserve_count
      FROM fantasy_team_riders
      WHERE fantasy_team_id = team_record.fantasy_team_id
        AND slot_type = 'reserve' AND active = false;

      RAISE NOTICE 'Team %: Fixed - % main (active), % reserve (inactive)', 
        team_record.fantasy_team_id, main_count, reserve_count;
    ELSE
      RAISE NOTICE 'Team %: Skipped - has % riders (expected 15)', 
        team_record.fantasy_team_id, rider_count;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fix completed!';
  RAISE NOTICE '========================================';
END $$;

-- Verify final state
SELECT 
  ft.id as fantasy_team_id,
  p.team_name,
  SUM(CASE WHEN ftr.slot_type = 'main' AND ftr.active = true THEN 1 ELSE 0 END) as main_active,
  SUM(CASE WHEN ftr.slot_type = 'main' AND ftr.active = false THEN 1 ELSE 0 END) as main_inactive,
  SUM(CASE WHEN ftr.slot_type = 'reserve' AND ftr.active = true THEN 1 ELSE 0 END) as reserve_active,
  SUM(CASE WHEN ftr.slot_type = 'reserve' AND ftr.active = false THEN 1 ELSE 0 END) as reserve_inactive,
  COUNT(*) as total_riders
FROM fantasy_teams ft
JOIN participants p ON ft.participant_id = p.id
LEFT JOIN fantasy_team_riders ftr ON ftr.fantasy_team_id = ft.id
GROUP BY ft.id, p.team_name
ORDER BY ft.id
LIMIT 20;

