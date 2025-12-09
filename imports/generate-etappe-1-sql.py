"""
Generate SQL script to import stage 1 results from etappe-1-uitslag.csv
"""

import csv
import os
from collections import defaultdict

# Known typos to fix
TYPO_CORRECTIONS = {
    'Mathieu': {'van der Po&': 'van der Poel'},
    'Rem++': {'Evenepoel': 'Evenepoel'},  # Remco
    'Primo+': {'Roglic': 'Roglic'},  # Primoz
    'Staff': {'Cras': 'Cras'},  # Steff
    'Bastion': {'Tronchon': 'Tronchon'},  # Bastien
    'Vito': {'Brant': 'Braet'},
    'Anders': {'Johannessen': 'Halland Johannessen'},
    'Thyme+': {'Arensman': 'Arensman'},  # Thymen
    'Gregor': {'Muehlberger': 'Muhlberger'},
    'Einar': {'Rubio': 'Rubio'},  # Einer
    'Frank': {'van den Brook': 'Van Den Broek'},
    'Ro&': {'van Sintmaartensdijk': 'van Sintmaartensdijk'},  # Roel
    'William': {'Barta': 'Barta'},  # Will
}

# Read CSV (use fixed version if available)
csv_file = 'imports/etappe-1-uitslag-fixed.csv'
if not os.path.exists(csv_file):
    csv_file = 'imports/etappe-1-uitslag.csv'

riders = []
with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Fix known typos
        first_name = row['first_name'].strip()
        last_name = row['last_name'].strip()
        
        if first_name in TYPO_CORRECTIONS:
            if last_name in TYPO_CORRECTIONS[first_name]:
                last_name = TYPO_CORRECTIONS[first_name][last_name]
        
        # Specific corrections
        if first_name == 'Rem++':
            first_name = 'Remco'
        elif first_name == 'Primo+':
            first_name = 'Primoz'
        elif first_name == 'Staff':
            first_name = 'Steff'
        elif first_name == 'Bastion':
            first_name = 'Bastien'
        elif first_name == 'Thyme+':
            first_name = 'Thymen'
        elif first_name == 'Einar':
            first_name = 'Einer'
        elif first_name == 'Ro&':
            first_name = 'Roel'
        elif first_name == 'William' and last_name == 'Barta':
            first_name = 'Will'
        
        row['first_name'] = first_name
        row['last_name'] = last_name
        riders.append(row)

print(f"✓ {len(riders)} renners gelezen")

# Group by time_seconds to calculate same_time_group
time_groups = defaultdict(list)
for i, rider in enumerate(riders, 1):
    time_seconds = rider.get('time_seconds', '').strip()
    if time_seconds:
        time_groups[int(time_seconds)].append(i)
    else:
        time_groups[None].append(i)

# Assign group numbers
group_number = 1
time_to_group = {}
for time_seconds in sorted(time_groups.keys(), key=lambda x: x if x is not None else float('inf')):
    time_to_group[time_seconds] = group_number
    group_number += 1

# Generate SQL
sql_lines = [
    "-- SQL Script to import Stage 1 results from etappe-1-uitslag.csv",
    "-- Generated automatically",
    f"-- Total riders: {len(riders)}",
    "",
    "-- First, verify that Stage 1 exists",
    "DO $$",
    "BEGIN",
    "  IF NOT EXISTS (SELECT 1 FROM stages WHERE stage_number = 1) THEN",
    "    RAISE EXCEPTION 'Stage 1 does not exist. Please run full-reset-and-import.sql first.';",
    "  END IF;",
    "END $$;",
    "",
    "-- Clear existing Stage 1 results",
    "DELETE FROM stage_results WHERE stage_id = (SELECT id FROM stages WHERE stage_number = 1);",
    "",
    "-- Insert Stage 1 results",
    "-- Uses rider_id from CSV if provided, otherwise looks up by name",
    "-- Calculates same_time_group based on time_seconds",
    "INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)",
    "WITH stage_data AS (",
    "  SELECT ",
    "    s.id as stage_id,",
    "    v.position,",
    "    v.first_name,",
    "    v.last_name,",
    "    v.rider_id_provided,",
    "    v.time_seconds,",
    "    -- Calculate same_time_group: assign group number based on time_seconds",
    "    DENSE_RANK() OVER (ORDER BY v.time_seconds NULLS LAST) as time_group",
    "  FROM stages s",
    "  CROSS JOIN (VALUES",
]

    # Add VALUES
values = []
for rider in riders:
    position = rider['position']
    # Escape single quotes for SQL (double them)
    first_name = rider['first_name'].replace("'", "''")
    last_name = rider['last_name'].replace("'", "''")
    rider_id = rider.get('rider_id', '').strip()
    time_seconds = rider.get('time_seconds', '').strip()
    
    # Handle empty rider_id
    if rider_id:
        rider_id_sql = f"NULLIF('{rider_id}', '')"
    else:
        rider_id_sql = "NULL"
    
    # Handle time_seconds
    if time_seconds:
        try:
            time_seconds_sql = int(time_seconds)
        except ValueError:
            time_seconds_sql = "NULL"
    else:
        time_seconds_sql = "NULL"
    
    values.append(f"    ({position}, '{first_name}', '{last_name}', {rider_id_sql}, {time_seconds_sql})")

sql_lines.append(',\n'.join(values))
sql_lines.extend([
    "  ) AS v(position, first_name, last_name, rider_id_provided, time_seconds)",
    "  WHERE s.stage_number = 1",
    "),",
    "rider_lookup AS (",
    "  SELECT ",
    "    sd.*,",
    "    CASE",
    "      WHEN sd.rider_id_provided IS NOT NULL AND sd.rider_id_provided != '' THEN sd.rider_id_provided::INTEGER",
    "      ELSE (",
    "        SELECT r.id",
    "        FROM riders r",
    "        WHERE LOWER(TRIM(r.first_name)) = LOWER(TRIM(sd.first_name))",
    "          AND LOWER(TRIM(r.last_name)) = LOWER(TRIM(sd.last_name))",
    "        LIMIT 1",
    "      )",
    "    END as rider_id",
    "  FROM stage_data sd",
    ")",
    "SELECT DISTINCT ON (stage_id, rider_id)",
    "  stage_id,",
    "  rider_id,",
    "  position,",
    "  time_seconds,",
    "  time_group as same_time_group",
    "FROM rider_lookup",
    "WHERE rider_id IS NOT NULL",
    "ORDER BY stage_id, rider_id, position",
    "ON CONFLICT (stage_id, rider_id)",
    "DO UPDATE SET",
    "  position = EXCLUDED.position,",
    "  time_seconds = EXCLUDED.time_seconds,",
    "  same_time_group = EXCLUDED.same_time_group;",
    "",
    "-- Verify the import",
    "SELECT ",
    "  COUNT(*) as total_results,",
    "  COUNT(DISTINCT rider_id) as unique_riders,",
    "  COUNT(DISTINCT same_time_group) as time_groups,",
    "  COUNT(*) FILTER (WHERE time_seconds IS NULL) as dnf_count",
    "FROM stage_results",
    "WHERE stage_id = (SELECT id FROM stages WHERE stage_number = 1);",
])

# Write SQL file
output_file = 'imports/import-etappe-1-uitslag.sql'
with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
    # Write each line separately to avoid any encoding issues
    for line in sql_lines:
        f.write(line + '\n')

print(f"✓ SQL script gegenereerd: {output_file}")
print(f"  - {len(riders)} renners")
print(f"  - {len(time_to_group)} verschillende tijd groepen")

