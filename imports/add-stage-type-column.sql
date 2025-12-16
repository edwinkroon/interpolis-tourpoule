-- SQL Script to add type column to stages table
-- Run this script to add the type column for stage classification

-- Add type column to stages table
ALTER TABLE stages 
ADD COLUMN IF NOT EXISTS type VARCHAR(20);

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'stages' 
  AND column_name = 'type';
