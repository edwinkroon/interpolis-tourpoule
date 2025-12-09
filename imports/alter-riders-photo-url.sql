-- SQL Script to alter photo_url column to support base64 encoded images
-- Base64 encoded images can be very long (several MB), so we use TEXT type

-- Check current column type and alter if needed
DO $$ 
BEGIN
  -- Check if column exists and what type it is
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'riders' 
    AND column_name = 'photo_url'
  ) THEN
    -- Alter the column to TEXT if it's not already (TEXT can hold up to 1GB)
    ALTER TABLE riders 
    ALTER COLUMN photo_url TYPE TEXT;
    
    -- Add a comment to document that this column stores base64 data
    COMMENT ON COLUMN riders.photo_url IS 'Base64 encoded image data (data URL format: data:image/[type];base64,[data])';
  ELSE
    -- If column doesn't exist, add it
    ALTER TABLE riders 
    ADD COLUMN photo_url TEXT;
    
    COMMENT ON COLUMN riders.photo_url IS 'Base64 encoded image data (data URL format: data:image/[type];base64,[data])';
  END IF;
END $$;

-- Verify the change
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  col_description(pgc.oid, ordinal_position) as column_comment
FROM information_schema.columns isc
JOIN pg_class pgc ON pgc.relname = isc.table_name
WHERE table_name = 'riders' 
AND column_name = 'photo_url';

