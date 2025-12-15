-- Remove ALL unique constraints on awards_per_participant and recreate only the new one
-- This fixes the issue where the old constraint (award_id + participant_id) conflicts with the new one

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find and drop all unique constraints
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'awards_per_participant'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE awards_per_participant DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  END LOOP;
  
  -- Recreate the new unique constraint with stage_id
  ALTER TABLE awards_per_participant
  ADD CONSTRAINT awards_per_participant_award_participant_stage_unique
  UNIQUE (award_id, participant_id, stage_id);
  
  RAISE NOTICE 'Created new unique constraint: awards_per_participant_award_participant_stage_unique';
END $$;
