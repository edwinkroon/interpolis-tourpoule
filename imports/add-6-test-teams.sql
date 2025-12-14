-- ============================================================================
-- ADD 6 TEST TEAMS WITH RANDOM RIDERS
-- ============================================================================
-- This script creates 6 test participants with fantasy teams and random riders
-- Each team has 15 riders (10 main + 5 reserve)
-- ============================================================================

-- Ensure fantasy_team_jerseys table exists
CREATE TABLE IF NOT EXISTS fantasy_team_jerseys (
  id SERIAL PRIMARY KEY,
  fantasy_team_id INTEGER NOT NULL,
  jersey_id INTEGER NOT NULL,
  rider_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (fantasy_team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  FOREIGN KEY (jersey_id) REFERENCES jerseys(id) ON DELETE CASCADE,
  FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE SET NULL,
  UNIQUE(fantasy_team_id, jersey_id)
);

DO $$
DECLARE
  participant_id_var INT;
  fantasy_team_id_var INT;
  rider_id_var INT;
  available_riders INT[];
  random_rider_ids INT[];
  jersey_ids INT[];
  jersey_types TEXT[] := ARRAY['geel', 'groen', 'bolletjes', 'wit'];
  jersey_id_var INT;
  jersey_rider_ids INT[];
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
  team_avatars TEXT[] := ARRAY[
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0ZGOTkwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSI0MCIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5WSDwvdGV4dD48L3N2Zz4=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN0NDQyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIzMCIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5CQzwvdGV4dD48L3N2Zz4=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0VEMDAwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIzMCIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5TRTwvdGV4dD48L3N2Zz4=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwODAwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIzMCIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5UVDwvdGV4dD48L3N2Zz4=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzkwMEY5MCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIzMCIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5QUDwvdGV4dD48L3N2Zz4=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0ZGNkEwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIzMCIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIj5URjwvdGV4dD48L3N2Zz4='
  ];
  team_emails TEXT[] := ARRAY[
    'vliegende.hollanders@test.nl',
    'bergklimmers@test.nl',
    'sprinters.express@test.nl',
    'tijdrijders@test.nl',
    'peloton.pioniers@test.nl',
    'tour.de.force@test.nl'
  ];
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
  
  IF array_length(jersey_ids, 1) < 4 THEN
    RAISE NOTICE 'Warning: Not all jerseys found. Found % jerseys, need 4.', array_length(jersey_ids, 1);
  END IF;
  -- Get all available rider IDs
  SELECT ARRAY_AGG(id ORDER BY RANDOM()) INTO available_riders
  FROM riders
  WHERE id IS NOT NULL;
  
  -- Check if we have enough riders (need at least 15 per team = 90 total)
  IF array_length(available_riders, 1) < 90 THEN
    RAISE NOTICE 'Warning: Only % riders available, need at least 90 for 6 teams', array_length(available_riders, 1);
  END IF;
  
  -- Create 6 test participants
  FOR i IN 1..6 LOOP
    RAISE NOTICE 'Creating test team %: %...', i, team_names[i];
    
    -- Insert participant
    INSERT INTO participants (user_id, team_name, email, avatar_url, newsletter, created_at)
    VALUES (
      'test-team-' || i,
      team_names[i],
      team_emails[i],
      team_avatars[i],
      false,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      team_name = EXCLUDED.team_name,
      email = EXCLUDED.email,
      avatar_url = EXCLUDED.avatar_url
    RETURNING id INTO participant_id_var;
    
    -- Get participant ID if it already existed
    IF participant_id_var IS NULL THEN
      SELECT id INTO participant_id_var
      FROM participants
      WHERE user_id = 'test-team-' || i;
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
    
    -- Add jersey wearers (truidragers) for this team
    -- Select 4 random riders from the team for the 4 jerseys
    IF array_length(jersey_ids, 1) >= 4 AND array_length(random_rider_ids, 1) >= 4 THEN
      -- Shuffle the rider IDs to get random jersey assignments
      SELECT ARRAY_AGG(id ORDER BY RANDOM())
      INTO jersey_rider_ids
      FROM (
        SELECT id
        FROM unnest(random_rider_ids[1:LEAST(15, array_length(random_rider_ids, 1))]) as id
        LIMIT 4
      ) sub;
      
      -- Assign jerseys to riders
      FOR j IN 1..LEAST(4, array_length(jersey_ids, 1), array_length(jersey_rider_ids, 1)) LOOP
        jersey_id_var := jersey_ids[j];
        rider_id_var := jersey_rider_ids[j];
        
        INSERT INTO fantasy_team_jerseys (fantasy_team_id, jersey_id, rider_id, created_at, updated_at)
        VALUES (fantasy_team_id_var, jersey_id_var, rider_id_var, NOW(), NOW())
        ON CONFLICT (fantasy_team_id, jersey_id) DO UPDATE SET
          rider_id = EXCLUDED.rider_id,
          updated_at = NOW();
        
        RAISE NOTICE '    Assigned jersey % (jersey_id: %) to rider %', jersey_types[j], jersey_id_var, rider_id_var;
      END LOOP;
    ELSE
      RAISE NOTICE '    Warning: Not enough jerseys or riders to assign all jerseys';
    END IF;
    
    RAISE NOTICE '  ✓ Test team % created successfully with riders and jerseys', i;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ All 6 test teams created successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Test teams created:';
  RAISE NOTICE '  1. De Vliegende Hollanders (test-team-1)';
  RAISE NOTICE '  2. Team Bergklimmers (test-team-2)';
  RAISE NOTICE '  3. De Sprinters Express (test-team-3)';
  RAISE NOTICE '  4. Team Tijdrijders (test-team-4)';
  RAISE NOTICE '  5. De Peloton Pioniers (test-team-5)';
  RAISE NOTICE '  6. Team Tour De Force (test-team-6)';
  RAISE NOTICE '';
  RAISE NOTICE 'Each team has:';
  RAISE NOTICE '  - 10 main riders';
  RAISE NOTICE '  - 5 reserve riders';
  RAISE NOTICE '  - 4 jersey wearers (geel, groen, bolletjes, wit)';
  
END $$;

-- Verify the created teams
SELECT 
  p.id as participant_id,
  p.user_id,
  p.team_name,
  p.email,
  CASE WHEN p.avatar_url IS NOT NULL THEN 'Yes' ELSE 'No' END as has_avatar,
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
GROUP BY p.id, p.user_id, p.team_name, p.email, p.avatar_url, ft.id
ORDER BY p.id;

-- Show jersey assignments for each team
SELECT 
  p.team_name,
  j.type as jersey_type,
  j.name as jersey_name,
  r.first_name || ' ' || r.last_name as rider_name
FROM participants p
JOIN fantasy_teams ft ON ft.participant_id = p.id
JOIN fantasy_team_jerseys ftj ON ftj.fantasy_team_id = ft.id
JOIN jerseys j ON ftj.jersey_id = j.id
LEFT JOIN riders r ON ftj.rider_id = r.id
WHERE p.user_id LIKE 'test-team-%'
ORDER BY p.team_name, 
  CASE j.type
    WHEN 'geel' THEN 1
    WHEN 'groen' THEN 2
    WHEN 'bolletjes' THEN 3
    WHEN 'wit' THEN 4
    ELSE 5
  END;


