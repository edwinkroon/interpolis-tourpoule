-- ============================================================================
-- ADD 5 RANDOM TEST TEAMS
-- ============================================================================
-- This script creates 5 test participants with fantasy teams and random riders
-- Useful for testing functionality with multiple teams
-- ============================================================================

DO $$
DECLARE
  participant_id_var INT;
  fantasy_team_id_var INT;
  rider_id_var INT;
  available_riders INT[];
  random_rider_ids INT[];
  i INT;
  slot_num INT;
BEGIN
  -- Get all available rider IDs
  SELECT ARRAY_AGG(id ORDER BY RANDOM()) INTO available_riders
  FROM riders
  WHERE id IS NOT NULL;
  
  -- Check if we have enough riders (need at least 15 per team = 75 total)
  IF array_length(available_riders, 1) < 75 THEN
    RAISE NOTICE 'Warning: Only % riders available, need at least 75 for 5 teams', array_length(available_riders, 1);
  END IF;
  
  -- Create 5 test participants
  FOR i IN 1..5 LOOP
    RAISE NOTICE 'Creating test team %...', i;
    
    -- Insert participant
    INSERT INTO participants (user_id, team_name, email, newsletter, created_at)
    VALUES (
      'test-user-' || i,
      'Test Team ' || i,
      'test' || i || '@example.com',
      false,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      team_name = EXCLUDED.team_name,
      email = EXCLUDED.email
    RETURNING id INTO participant_id_var;
    
    -- Get participant ID if it already existed
    IF participant_id_var IS NULL THEN
      SELECT id INTO participant_id_var
      FROM participants
      WHERE user_id = 'test-user-' || i;
    END IF;
    
    RAISE NOTICE '  Participant ID: %', participant_id_var;
    
    -- Create fantasy team
    INSERT INTO fantasy_teams (participant_id, created_at)
    VALUES (participant_id_var, NOW())
    ON CONFLICT (participant_id) DO NOTHING
    RETURNING id INTO fantasy_team_id_var;
    
    -- Get fantasy team ID if it already existed
    IF fantasy_team_id_var IS NULL THEN
      SELECT id INTO fantasy_team_id_var
      FROM fantasy_teams
      WHERE participant_id = participant_id_var;
    END IF;
    
    RAISE NOTICE '  Fantasy Team ID: %', fantasy_team_id_var;
    
    -- Clear existing riders for this team (if any)
    DELETE FROM fantasy_team_riders
    WHERE fantasy_team_id = fantasy_team_id_var;
    
    -- Select 15 random riders for this team (avoiding duplicates)
    -- Use a different random seed for each team to get different riders
    SELECT ARRAY_AGG(id ORDER BY RANDOM())
    INTO random_rider_ids
    FROM (
      SELECT id
      FROM riders
      WHERE id IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 15
    ) sub;
    
    -- Add 10 main riders (slot_type = 'main', slot_number = 1-10)
    FOR slot_num IN 1..10 LOOP
      IF slot_num <= array_length(random_rider_ids, 1) THEN
        INSERT INTO fantasy_team_riders (fantasy_team_id, rider_id, slot_type, slot_number, active)
        VALUES (fantasy_team_id_var, random_rider_ids[slot_num], 'main', slot_num, true)
        ON CONFLICT (fantasy_team_id, rider_id) DO UPDATE SET
          slot_type = EXCLUDED.slot_type,
          slot_number = EXCLUDED.slot_number,
          active = true;
        
        RAISE NOTICE '    Added main rider % (rider_id: %)', slot_num, random_rider_ids[slot_num];
      END IF;
    END LOOP;
    
    -- Add 5 reserve riders (slot_type = 'reserve', slot_number = 1-5)
    FOR slot_num IN 1..5 LOOP
      IF (10 + slot_num) <= array_length(random_rider_ids, 1) THEN
        INSERT INTO fantasy_team_riders (fantasy_team_id, rider_id, slot_type, slot_number, active)
        VALUES (fantasy_team_id_var, random_rider_ids[10 + slot_num], 'reserve', slot_num, true)
        ON CONFLICT (fantasy_team_id, rider_id) DO UPDATE SET
          slot_type = EXCLUDED.slot_type,
          slot_number = EXCLUDED.slot_number,
          active = true;
        
        RAISE NOTICE '    Added reserve rider % (rider_id: %)', slot_num, random_rider_ids[10 + slot_num];
      END IF;
    END LOOP;
    
    RAISE NOTICE '  ✓ Test team % created successfully', i;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ All 5 test teams created successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Test users created:';
  RAISE NOTICE '  - test-user-1 (Test Team 1)';
  RAISE NOTICE '  - test-user-2 (Test Team 2)';
  RAISE NOTICE '  - test-user-3 (Test Team 3)';
  RAISE NOTICE '  - test-user-4 (Test Team 4)';
  RAISE NOTICE '  - test-user-5 (Test Team 5)';
  RAISE NOTICE '';
  RAISE NOTICE 'Each team has 10 main riders and 5 reserve riders.';
  
END $$;

-- Verify the created teams
SELECT 
  p.id as participant_id,
  p.user_id,
  p.team_name,
  ft.id as fantasy_team_id,
  COUNT(DISTINCT CASE WHEN ftr.slot_type = 'main' THEN ftr.id END) as main_riders,
  COUNT(DISTINCT CASE WHEN ftr.slot_type = 'reserve' THEN ftr.id END) as reserve_riders,
  COUNT(DISTINCT ftr.id) as total_riders
FROM participants p
LEFT JOIN fantasy_teams ft ON ft.participant_id = p.id
LEFT JOIN fantasy_team_riders ftr ON ftr.fantasy_team_id = ft.id AND ftr.active = true
WHERE p.user_id LIKE 'test-user-%'
GROUP BY p.id, p.user_id, p.team_name, ft.id
ORDER BY p.id;

