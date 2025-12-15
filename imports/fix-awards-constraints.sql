-- Fix awards_per_participant constraints
-- Remove old unique constraint (award_id + participant_id) if it exists
-- Keep new unique constraint (award_id + participant_id + stage_id)

DO $$
BEGIN
  -- Drop old unique constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'awards_per_participant'::regclass 
      AND conname = 'awards_per_participant_award_id_participant_id_key'
      AND contype = 'u'
  ) THEN
    ALTER TABLE awards_per_participant
    DROP CONSTRAINT awards_per_participant_award_id_participant_id_key;
    
    RAISE NOTICE 'Removed old unique constraint awards_per_participant_award_id_participant_id_key';
  ELSE
    RAISE NOTICE 'Old unique constraint does not exist';
  END IF;
END $$;
