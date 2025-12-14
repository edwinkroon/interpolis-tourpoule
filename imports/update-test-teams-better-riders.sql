-- ============================================================================
-- UPDATE TEST TEAMS WITH BETTER RIDERS
-- ============================================================================
-- This script updates the 6 test teams with better riders
-- Riders are selected based on popularity (most selected in other teams)
-- Each team gets a mix of good riders (70%) and average riders (30%) for realism
-- ============================================================================

DO $$
DECLARE
  participant_id_var INT;
  fantasy_team_id_var INT;
  rider_id_var INT;
  popular_rider_ids INT[];
  average_rider_ids INT[];
  team_rider_ids INT[];
  jersey_ids INT[];
  jersey_types TEXT[] := ARRAY['geel', 'groen', 'bolletjes', 'wit'];
  jersey_id_var INT;
  jersey_rider_ids INT[];
  selected_popular INT[];
  selected_average INT[];
  i INT;
  j INT;
  slot_num INT;
  team_names TEXT[] := ARRAY[
    'De Vliegende Hollanders',
    'Team Bergklimmers',
    'De Sprinters Express',
    'Team Tijdrijders',
    'De Peloton Pioniers',
    'Team Tour De Force'
  ];
  -- Number of good riders per team (70% of 15 = ~10-11)
  good_riders_count INT := 11;
  -- Number of average riders per team (30% of 15 = ~4-5)
  average_riders_count INT := 4;
BEGIN
  -- Get jersey IDs
  SELECT ARRAY_AGG(id ORDER BY 
    CASE type
      WHEN 'geel' THEN 1
      WHEN 'groen' THEN 2
      WHEN 'bolletjes' THEN 3
      WHEN 'wit' THEN 4
      ELSE 5
    END
  ) INTO jersey_ids
  FROM jerseys
  WHERE type = ANY(jersey_types);
  
  -- Get popular riders (most selected in other teams, excluding test teams)
  -- Take top 100 most selected riders
  SELECT ARRAY_AGG(rider_id ORDER BY selection_count DESC)
  INTO popular_rider_ids
  FROM (
    SELECT 
      ftr.rider_id,
      COUNT(DISTINCT ftr.fantasy_team_id) as selection_count
    FROM fantasy_team_riders ftr
    JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
    JOIN participants p ON ft.participant_id = p.id
    WHERE ftr.active = true
      AND p.user_id NOT LIKE 'test-team-%'
    GROUP BY ftr.rider_id
    ORDER BY selection_count DESC
    LIMIT 100
  ) popular;
  
  -- If no popular riders found (no other teams exist), use a smart mix strategy:
  -- Select riders from diverse teams_pro to simulate realistic team selection
  IF array_length(popular_rider_ids, 1) IS NULL OR array_length(popular_rider_ids, 1) = 0 THEN
    -- Create a pool of "good" riders: prioritize riders from different teams_pro
    -- This simulates selecting a diverse but quality team
    WITH team_diversity AS (
      SELECT 
        r.id,
        tp.name as team_name,
        ROW_NUMBER() OVER (PARTITION BY r.team_pro_id ORDER BY RANDOM()) as team_rank
      FROM riders r
      LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
      WHERE r.id IS NOT NULL
    )
    SELECT ARRAY_AGG(id ORDER BY team_rank, RANDOM())
    INTO popular_rider_ids
    FROM team_diversity
    WHERE team_rank <= 3  -- Take up to 3 riders per team_pro for diversity
    LIMIT 100;
    
    -- If still not enough, fill with random riders
    IF array_length(popular_rider_ids, 1) < 50 THEN
      SELECT ARRAY_AGG(id ORDER BY RANDOM())
      INTO popular_rider_ids
      FROM (
        SELECT id FROM unnest(COALESCE(popular_rider_ids, ARRAY[]::INT[])) as id
        UNION
        SELECT id FROM riders WHERE id IS NOT NULL AND id != ALL(COALESCE(popular_rider_ids, ARRAY[]::INT[])) ORDER BY RANDOM() LIMIT 100
      ) combined
      LIMIT 100;
    END IF;
  END IF;
  
  -- Get average riders (riders that are selected less often, or random if no data)
  -- Take riders that are not in the top 100 most selected
  SELECT ARRAY_AGG(rider_id ORDER BY RANDOM())
  INTO average_rider_ids
  FROM (
    SELECT DISTINCT r.id as rider_id
    FROM riders r
    WHERE r.id IS NOT NULL
      AND (r.id != ALL(COALESCE(popular_rider_ids, ARRAY[]::INT[])))
    LIMIT 200
  ) average;
  
  -- If not enough average riders, use random riders from all riders
  IF array_length(average_rider_ids, 1) IS NULL OR array_length(average_rider_ids, 1) < average_riders_count THEN
    SELECT ARRAY_AGG(id ORDER BY RANDOM())
    INTO average_rider_ids
    FROM riders
    WHERE id IS NOT NULL
      AND (array_length(popular_rider_ids, 1) IS NULL OR id != ALL(popular_rider_ids))
    LIMIT 200;
  END IF;
  
  RAISE NOTICE 'Found % popular riders and % average riders', 
    COALESCE(array_length(popular_rider_ids, 1), 0),
    COALESCE(array_length(average_rider_ids, 1), 0);
  
  -- Update each of the 6 test teams
  FOR i IN 1..6 LOOP
    RAISE NOTICE '';
    RAISE NOTICE 'Updating test team %: %...', i, team_names[i];
    
    -- Get participant ID
    SELECT id INTO participant_id_var
    FROM participants
    WHERE user_id = 'test-team-' || i;
    
    IF participant_id_var IS NULL THEN
      RAISE NOTICE '  ⚠️  Team % not found, skipping...', team_names[i];
      CONTINUE;
    END IF;
    
    RAISE NOTICE '  Participant ID: %', participant_id_var;
    
    -- Get fantasy team ID
    SELECT id INTO fantasy_team_id_var
    FROM fantasy_teams
    WHERE participant_id = participant_id_var;
    
    IF fantasy_team_id_var IS NULL THEN
      RAISE NOTICE '  ⚠️  Fantasy team not found, skipping...';
      CONTINUE;
    END IF;
    
    RAISE NOTICE '  Fantasy Team ID: %', fantasy_team_id_var;
    
    -- Clear existing riders for this team
    DELETE FROM fantasy_team_riders
    WHERE fantasy_team_id = fantasy_team_id_var;
    
    -- Select riders for this team: mix of popular and average riders
    -- Use different random selection for each team to get variety
    team_rider_ids := ARRAY[]::INT[];
    selected_popular := ARRAY[]::INT[];
    selected_average := ARRAY[]::INT[];
    
    -- Add good riders (70% - 11 riders from popular list)
    -- Use a different random selection for each team
    IF array_length(popular_rider_ids, 1) IS NOT NULL AND array_length(popular_rider_ids, 1) >= good_riders_count THEN
      -- Select random subset from popular riders (different for each team)
      SELECT ARRAY_AGG(id ORDER BY RANDOM())
      INTO selected_popular
      FROM (
        SELECT id FROM unnest(popular_rider_ids) as id
        ORDER BY RANDOM()
        LIMIT good_riders_count
      ) sub;
      
      team_rider_ids := team_rider_ids || selected_popular;
    END IF;
    
    -- Add average riders (30% - 4 riders from average list)
    IF array_length(average_rider_ids, 1) IS NOT NULL AND array_length(average_rider_ids, 1) >= average_riders_count THEN
      -- Select random subset from average riders
      SELECT ARRAY_AGG(id ORDER BY RANDOM())
      INTO selected_average
      FROM (
        SELECT id FROM unnest(average_rider_ids) as id
        ORDER BY RANDOM()
        LIMIT average_riders_count
      ) sub;
      
      team_rider_ids := team_rider_ids || selected_average;
    END IF;
    
    -- Shuffle the combined array to mix good and average riders
    SELECT ARRAY_AGG(id ORDER BY RANDOM())
    INTO team_rider_ids
    FROM unnest(team_rider_ids) as id;
    
    -- Ensure we have exactly 15 riders (pad with random if needed)
    WHILE array_length(team_rider_ids, 1) < 15 LOOP
      SELECT ARRAY_APPEND(
        team_rider_ids,
        (SELECT id FROM riders WHERE id IS NOT NULL AND id != ALL(team_rider_ids) ORDER BY RANDOM() LIMIT 1)
      ) INTO team_rider_ids;
    END LOOP;
    
    -- Trim to exactly 15
    team_rider_ids := team_rider_ids[1:15];
    
    RAISE NOTICE '  Selected % riders for team', array_length(team_rider_ids, 1);
    
    -- Add 10 main riders (slot_type = 'main', slot_number = 1-10)
    FOR slot_num IN 1..10 LOOP
      IF slot_num <= array_length(team_rider_ids, 1) THEN
        INSERT INTO fantasy_team_riders (fantasy_team_id, rider_id, slot_type, slot_number, active)
        VALUES (fantasy_team_id_var, team_rider_ids[slot_num], 'main', slot_num, true)
        ON CONFLICT (fantasy_team_id, rider_id) DO UPDATE SET
          slot_type = EXCLUDED.slot_type,
          slot_number = EXCLUDED.slot_number,
          active = true;
      END IF;
    END LOOP;
    
    -- Add 5 reserve riders (slot_type = 'reserve', slot_number = 1-5)
    FOR slot_num IN 1..5 LOOP
      IF (10 + slot_num) <= array_length(team_rider_ids, 1) THEN
        INSERT INTO fantasy_team_riders (fantasy_team_id, rider_id, slot_type, slot_number, active)
        VALUES (fantasy_team_id_var, team_rider_ids[10 + slot_num], 'reserve', slot_num, true)
        ON CONFLICT (fantasy_team_id, rider_id) DO UPDATE SET
          slot_type = EXCLUDED.slot_type,
          slot_number = EXCLUDED.slot_number,
          active = true;
      END IF;
    END LOOP;
    
    -- Update jersey wearers (truidragers) for this team
    -- Select 4 random riders from the team for the 4 jerseys
    IF array_length(jersey_ids, 1) >= 4 AND array_length(team_rider_ids, 1) >= 4 THEN
      -- Select 4 random riders from the team (prefer main riders)
      SELECT ARRAY_AGG(id ORDER BY RANDOM())
      INTO jersey_rider_ids
      FROM unnest(team_rider_ids[1:10]) as id  -- Prefer main riders for jerseys
      LIMIT 4;
      
      -- If we don't have 4 from main, add from reserves
      IF array_length(jersey_rider_ids, 1) < 4 THEN
        SELECT ARRAY_AGG(id ORDER BY RANDOM())
        INTO jersey_rider_ids
        FROM (
          SELECT id FROM unnest(team_rider_ids[1:10]) as id
          UNION
          SELECT id FROM unnest(team_rider_ids[11:15]) as id
          WHERE id != ALL(COALESCE(jersey_rider_ids, ARRAY[]::INT[]))
        ) sub
        LIMIT 4;
      END IF;
      
      -- Assign jerseys to riders
      FOR j IN 1..LEAST(4, array_length(jersey_ids, 1), array_length(jersey_rider_ids, 1)) LOOP
        jersey_id_var := jersey_ids[j];
        rider_id_var := jersey_rider_ids[j];
        
        INSERT INTO fantasy_team_jerseys (fantasy_team_id, jersey_id, rider_id, created_at, updated_at)
        VALUES (fantasy_team_id_var, jersey_id_var, rider_id_var, NOW(), NOW())
        ON CONFLICT (fantasy_team_id, jersey_id) DO UPDATE SET
          rider_id = EXCLUDED.rider_id,
          updated_at = NOW();
      END LOOP;
    END IF;
    
    RAISE NOTICE '  ✓ Test team % updated successfully with better riders', i;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ All 6 test teams updated with better riders!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Each team now has:';
  RAISE NOTICE '  - ~70%% popular/good riders (11 riders)';
  RAISE NOTICE '  - ~30%% average riders (4 riders)';
  RAISE NOTICE '  - 10 main riders + 5 reserve riders';
  RAISE NOTICE '  - 4 jersey wearers (updated)';
  
END $$;

-- Verify the updated teams
SELECT 
  p.id as participant_id,
  p.user_id,
  p.team_name,
  ft.id as fantasy_team_id,
  COUNT(DISTINCT CASE WHEN ftr.slot_type = 'main' THEN ftr.id END) as main_riders,
  COUNT(DISTINCT CASE WHEN ftr.slot_type = 'reserve' THEN ftr.id END) as reserve_riders,
  COUNT(DISTINCT ftr.id) as total_riders,
  COUNT(DISTINCT ftj.id) as jersey_assignments
FROM participants p
LEFT JOIN fantasy_teams ft ON ft.participant_id = p.id
LEFT JOIN fantasy_team_riders ftr ON ftr.fantasy_team_id = ft.id AND ftr.active = true
LEFT JOIN fantasy_team_jerseys ftj ON ftj.fantasy_team_id = ft.id
WHERE p.user_id LIKE 'test-team-%'
GROUP BY p.id, p.user_id, p.team_name, ft.id
ORDER BY p.id;

-- Show some sample riders from each team to verify quality
SELECT 
  p.team_name,
  r.first_name || ' ' || r.last_name as rider_name,
  tp.name as rider_team,
  ftr.slot_type,
  ftr.slot_number,
  (SELECT COUNT(DISTINCT ftr2.fantasy_team_id) 
   FROM fantasy_team_riders ftr2 
   JOIN fantasy_teams ft2 ON ftr2.fantasy_team_id = ft2.id
   JOIN participants p2 ON ft2.participant_id = p2.id
   WHERE ftr2.rider_id = r.id 
     AND ftr2.active = true
     AND p2.user_id NOT LIKE 'test-team-%'
  ) as popularity_count
FROM participants p
JOIN fantasy_teams ft ON ft.participant_id = p.id
JOIN fantasy_team_riders ftr ON ftr.fantasy_team_id = ft.id AND ftr.active = true
JOIN riders r ON ftr.rider_id = r.id
LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
WHERE p.user_id LIKE 'test-team-%'
ORDER BY p.team_name, ftr.slot_type, ftr.slot_number
LIMIT 30;

