-- Add stage_id column to awards_per_participant table
-- This allows awards to be tracked per stage (for per-stage awards like PODIUM_1, PODIUM_2, PODIUM_3)

-- Check if column already exists
DO $$
BEGIN
  -- Add stage_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'awards_per_participant' 
    AND column_name = 'stage_id'
  ) THEN
    ALTER TABLE awards_per_participant 
    ADD COLUMN stage_id INT;
    
    -- Add foreign key constraint
    ALTER TABLE awards_per_participant
    ADD CONSTRAINT awards_per_participant_stage_id_fkey
    FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE;
    
    -- Add unique constraint: award_id + participant_id + stage_id must be unique
    -- This allows the same award to be given to the same participant in different stages
    ALTER TABLE awards_per_participant
    ADD CONSTRAINT awards_per_participant_award_participant_stage_unique
    UNIQUE (award_id, participant_id, stage_id);
    
    -- Drop old unique constraint if it exists (award_id + participant_id)
    -- Note: This might fail if there are existing duplicates, handle manually if needed
    ALTER TABLE awards_per_participant
    DROP CONSTRAINT IF EXISTS awards_per_participant_award_id_participant_id_key;
    
    RAISE NOTICE 'Added stage_id column to awards_per_participant table';
  ELSE
    RAISE NOTICE 'stage_id column already exists in awards_per_participant table';
  END IF;
END $$;
