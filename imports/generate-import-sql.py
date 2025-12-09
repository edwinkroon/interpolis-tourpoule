import csv
import sys

# Read the CSV file
csv_file = 'riders.csv'
sql_file = 'import-riders-generated.sql'

# Read CSV and generate SQL
with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    
    # Start building SQL
    sql = """-- SQL Script to import riders from riders.csv into riders table
-- This file is auto-generated from riders.csv
-- Run this script in your SQL editor
-- Make sure teams_pro table is already populated before running this script

-- First, ensure the riders table exists with the correct structure
CREATE TABLE IF NOT EXISTS riders (
  id SERIAL PRIMARY KEY,
  team_pro_id INTEGER,
  first_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  nationality VARCHAR(80),
  weight_kg NUMERIC(4, 1),
  height_m NUMERIC(3, 2),
  photo_url TEXT
);

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'riders_team_pro_id_fkey'
  ) THEN
    ALTER TABLE riders 
    ADD CONSTRAINT riders_team_pro_id_fkey 
    FOREIGN KEY (team_pro_id) REFERENCES teams_pro(id);
  END IF;
END $$;

-- Insert riders from riders.csv with all fields
-- Using subquery to match team_name with teams_pro to get team_pro_id
INSERT INTO riders (team_pro_id, first_name, last_name, date_of_birth, nationality, weight_kg, height_m, photo_url)
SELECT 
  tp.id as team_pro_id,
  r.first_name,
  r.last_name,
  r.date_of_birth::DATE,
  r.nationality,
  r.weight_kg::NUMERIC(4,1),
  r.height_m::NUMERIC(3,2),
  NULLIF(r.photo_url, '') as photo_url
FROM (
  VALUES
"""
    
    values = []
    for row in reader:
        first_name = row['first_name'].replace("'", "''")
        last_name = row['last_name'].replace("'", "''")
        team_name = row['team_name'].replace("'", "''")
        nationality = row['nationality'].replace("'", "''")
        date_of_birth = row['date_of_birth'] if row['date_of_birth'] else 'NULL'
        weight_kg = row['weight_kg'] if row['weight_kg'] else 'NULL'
        height_m = row['height_m'] if row['height_m'] else 'NULL'
        photo_url = row['photo_url'] if row['photo_url'] else ''
        
        values.append(f"    ('{first_name}', '{last_name}', '{team_name}', '{nationality}', '{date_of_birth}', {weight_kg}, {height_m}, '{photo_url}')")
    
    sql += ',\n'.join(values)
    sql += """
) AS r(first_name, last_name, team_name, nationality, date_of_birth, weight_kg, height_m, photo_url)
INNER JOIN teams_pro tp ON tp.name = r.team_name
ON CONFLICT DO NOTHING;

-- Verify the import
SELECT COUNT(*) as total_riders FROM riders;
SELECT 
  r.id,
  r.first_name,
  r.last_name,
  r.date_of_birth,
  tp.name as team_name,
  r.nationality,
  r.weight_kg,
  r.height_m
FROM riders r
LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
ORDER BY r.last_name, r.first_name
LIMIT 20;
"""
    
    # Write SQL to file
    with open(sql_file, 'w', encoding='utf-8') as out:
        out.write(sql)
    
    print(f"Generated {sql_file} with {len(values)} riders")

