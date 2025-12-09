-- SQL Script to import teams from riders.csv into teams_pro table
-- Run this script in your SQL editor

-- First, ensure the teams_pro table exists
CREATE TABLE IF NOT EXISTS teams_pro (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL,
  country VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Add UNIQUE constraint on name if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'teams_pro_name_key'
  ) THEN
    ALTER TABLE teams_pro ADD CONSTRAINT teams_pro_name_key UNIQUE (name);
  END IF;
END $$;

-- Insert teams from riders.csv
-- Using ON CONFLICT to update existing teams or skip duplicates

INSERT INTO teams_pro (name, code, country)
VALUES
  ('UAE Team Emirates', 'UAD', 'UAE'),
  ('Team Visma-Lease a Bike', 'TVL', 'NED'),
  ('Soudal Quick-Step', 'SOQ', 'BEL'),
  ('Bora-Hansgrohe', 'BOH', 'GER'),
  ('INEOS Grenadiers', 'IGD', 'GBR'),
  ('EF Education-EasyPost', 'EFE', 'USA'),
  ('Groupama-FDJ', 'GFC', 'FRA'),
  ('Bahrain Victorious', 'TBV', 'BHR'),
  ('Alpecin-Deceuninck', 'ADC', 'BEL'),
  ('Movistar Team', 'MOV', 'ESP'),
  ('Lidl-Trek', 'LTK', 'USA'),
  ('Israel-Premier Tech', 'IPT', 'ISR'),
  ('Team Jayco AlUla', 'JAY', 'AUS'),
  ('Arkéa-B&B Hotels', 'ARK', 'FRA'),
  ('Cofidis', 'COF', 'FRA'),
  ('Decathlon AG2R La Mondiale Team', 'DAT', 'FRA'),
  ('Team dsm-firmenich PostNL', 'DSM', 'NED'),
  ('Astana Qazaqstan Team', 'AST', 'KAZ'),
  ('Uno-X Mobility', 'UXM', 'NOR'),
  ('Intermarché-Wanty', 'ICW', 'BEL')
ON CONFLICT (name) 
DO UPDATE SET 
  code = EXCLUDED.code,
  country = EXCLUDED.country;

-- Verify the import
SELECT COUNT(*) as total_teams FROM teams_pro;
SELECT * FROM teams_pro ORDER BY name;

