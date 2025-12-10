-- SQL Script to add admin support and settings
-- Run this script to add admin functionality

-- Add is_admin field to participants table
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create settings table for application settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES participants(id)
);

-- Add is_neutralized field to stages table
ALTER TABLE stages 
ADD COLUMN IF NOT EXISTS is_neutralized BOOLEAN DEFAULT false;

-- Add is_cancelled field to stages table (for cancelled stages)
ALTER TABLE stages 
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false;

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('registration_deadline', '2025-07-05 12:00:00', 'Deadline voor aanmeldingen (YYYY-MM-DD HH:MM:SS)'),
  ('tour_start_date', '2025-07-06', 'Startdatum van de Tour de France (YYYY-MM-DD)'),
  ('tour_end_date', '2025-07-27', 'Einddatum van de Tour de France (YYYY-MM-DD)')
ON CONFLICT (key) DO NOTHING;

-- Create index on is_admin for faster lookups
CREATE INDEX IF NOT EXISTS idx_participants_is_admin ON participants(is_admin) WHERE is_admin = true;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'participants' 
  AND column_name = 'is_admin';

SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'stages' 
  AND column_name IN ('is_neutralized', 'is_cancelled');

SELECT * FROM settings;

