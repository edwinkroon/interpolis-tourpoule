-- SQL Script to add rider Soren Waerenskjold (Uno-X Mobility)
-- This rider was missing from the riders table

-- First, check if the rider already exists
DO $$
DECLARE
  rider_exists BOOLEAN;
  team_pro_id_val INT;
BEGIN
  -- Check if rider already exists
  SELECT EXISTS(
    SELECT 1 FROM riders 
    WHERE LOWER(TRIM(first_name)) = 'soren' 
      AND LOWER(TRIM(last_name)) = 'waerenskjold'
  ) INTO rider_exists;
  
  IF rider_exists THEN
    RAISE NOTICE 'Rider Soren Waerenskjold already exists in the database.';
  ELSE
    -- Find team_pro_id for Uno-X Mobility
    SELECT id INTO team_pro_id_val 
    FROM teams_pro 
    WHERE LOWER(TRIM(name)) LIKE '%uno-x%' 
       OR LOWER(TRIM(name)) LIKE '%uno x%'
    LIMIT 1;
    
    -- Insert the rider
    INSERT INTO riders (first_name, last_name, team_pro_id, nationality)
    VALUES (
      'Soren',
      'Waerenskjold',
      team_pro_id_val,
      'Norway'  -- Assuming Norwegian based on team
    );
    
    RAISE NOTICE 'Rider Soren Waerenskjold added successfully.';
    
    -- Update normalized columns if they exist
    -- Normalized names: convert to lowercase (no diacritics in "Soren" and "Waerenskjold")
    BEGIN
      UPDATE riders 
      SET 
        first_name_normalized = LOWER('Soren'),
        last_name_normalized = LOWER('Waerenskjold')
      WHERE first_name = 'Soren' AND last_name = 'Waerenskjold';
      
      RAISE NOTICE 'Normalized columns updated.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Normalized columns do not exist or update failed (this is OK).';
    END;
  END IF;
END $$;

-- Verify the rider was added
SELECT 
  id,
  first_name,
  last_name,
  team_pro_id,
  nationality,
  (SELECT name FROM teams_pro WHERE id = riders.team_pro_id) as team_name
FROM riders 
WHERE LOWER(TRIM(first_name)) = 'soren' 
  AND LOWER(TRIM(last_name)) = 'waerenskjold';

