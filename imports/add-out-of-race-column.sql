-- Add out_of_race column to fantasy_team_riders table
-- Run met je DATABASE_URL, bijv.:
--   $env:DATABASE_URL="postgresql://POSTGRES_USER:POSTGRES_PASSWORD@localhost:5432/POSTGRES_DB"
--   node imports/run-sql-script.js imports/add-out-of-race-column.sql

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fantasy_team_riders' 
    AND column_name = 'out_of_race'
  ) THEN
    ALTER TABLE fantasy_team_riders 
    ADD COLUMN out_of_race BOOLEAN NOT NULL DEFAULT false;
    
    RAISE NOTICE 'Column out_of_race added to fantasy_team_riders';
  ELSE
    RAISE NOTICE 'Column out_of_race already exists in fantasy_team_riders';
  END IF;
END $$;

-- Update existing records: set out_of_race = true for riders that are DNS/DNF
-- This checks the latest stage with results
DO $$
DECLARE
  latest_stage_id INT;
BEGIN
  -- Get the latest stage with results
  SELECT id INTO latest_stage_id
  FROM stages
  WHERE id IN (SELECT DISTINCT stage_id FROM stage_results)
  ORDER BY stage_number DESC
  LIMIT 1;
  
  IF latest_stage_id IS NOT NULL THEN
    -- Set out_of_race = true for riders that are DNF (time_seconds IS NULL) in latest stage
    UPDATE fantasy_team_riders ftr
    SET out_of_race = true
    WHERE EXISTS (
      SELECT 1
      FROM stage_results sr
      WHERE sr.rider_id = ftr.rider_id
        AND sr.stage_id = latest_stage_id
        AND sr.time_seconds IS NULL
    );
    
    -- Set out_of_race = true for riders that are DNS (no result in latest stage)
    -- but only if they were previously active and other riders have results
    UPDATE fantasy_team_riders ftr
    SET out_of_race = true
    WHERE ftr.active = false
      AND NOT EXISTS (
        SELECT 1
        FROM stage_results sr
        WHERE sr.rider_id = ftr.rider_id
          AND sr.stage_id = latest_stage_id
      )
      AND EXISTS (
        SELECT 1
        FROM stage_results sr
        WHERE sr.stage_id = latest_stage_id
        LIMIT 1
      );
    
    RAISE NOTICE 'Updated out_of_race for existing DNS/DNF riders';
  ELSE
    RAISE NOTICE 'No stages with results found, skipping update';
  END IF;
END $$;
