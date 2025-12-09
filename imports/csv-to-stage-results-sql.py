"""
Script to convert CSV file with stage results to SQL INSERT statements
CSV format should be:
stage_number,first_name,last_name,position,time_seconds,same_time_group

Example CSV:
1,Jasper,Philipsen,1,12345,1
1,Mathieu,van der Poel,2,12350,2
1,Tim,Merlier,3,12350,2
...
"""

import csv
import sys

def generate_sql_from_csv(csv_file, output_file):
    """
    Read CSV file and generate SQL INSERT statements
    """
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        with open(output_file, 'w', encoding='utf-8') as out:
            out.write("-- SQL Script to import stage_results from CSV\n")
            out.write(f"-- Generated from {csv_file}\n")
            out.write("-- IMPORTANT: Make sure stages and riders are imported first\n\n")
            
            current_stage = None
            
            for row in reader:
                stage_num = int(row.get('stage_number', 0))
                first_name = row.get('first_name', '').strip()
                last_name = row.get('last_name', '').strip()
                position = int(row.get('position', 0))
                time_seconds = row.get('time_seconds', '').strip()
                same_time_group = row.get('same_time_group', '').strip()
                
                # Format time_seconds
                time_sql = time_seconds if time_seconds and time_seconds != '' else "NULL"
                group_sql = same_time_group if same_time_group and same_time_group != '' else "NULL"
                
                # Add comment for new stage
                if current_stage != stage_num:
                    if current_stage is not None:
                        out.write("\n")
                    out.write(f"-- Stage {stage_num} Results\n")
                    current_stage = stage_num
                
                # Escape single quotes in names
                first_name_escaped = first_name.replace("'", "''")
                last_name_escaped = last_name.replace("'", "''")
                
                out.write(f"""INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  {position} as position,
  {time_sql} as time_seconds,
  {group_sql} as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = {stage_num}
  AND r.first_name = '{first_name_escaped}' AND r.last_name = '{last_name_escaped}'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position,
  time_seconds = EXCLUDED.time_seconds,
  same_time_group = EXCLUDED.same_time_group;

""")
    
    print(f"SQL file generated: {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python csv-to-stage-results-sql.py <input.csv> [output.sql]")
        print("\nCSV format:")
        print("stage_number,first_name,last_name,position,time_seconds,same_time_group")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'import-stage-results-from-csv.sql'
    
    generate_sql_from_csv(csv_file, output_file)

