"""
Script to fetch complete stage results from procyclingstats.com for Tour de France 2025
This script scrapes the results page for each stage and generates SQL INSERT statements
"""

import requests
from bs4 import BeautifulSoup
import csv
import re
import time
from urllib.parse import urljoin

# Base URL for Tour de France 2025 on procyclingstats
BASE_URL = "https://www.procyclingstats.com/race/tour-de-france/2025"

def fetch_stage_results(stage_number):
    """
    Fetch complete results for a specific stage from procyclingstats
    Returns list of tuples: (rider_name, position, time_seconds, same_time_group)
    """
    # Construct URL for stage results
    # Format: https://www.procyclingstats.com/race/tour-de-france/2025/stage-{number}/result
    if stage_number == 1:
        url = f"{BASE_URL}/stage-1/result"
    elif stage_number == 5:
        # Stage 5 might be ITT
        url = f"{BASE_URL}/stage-5-itt/result"
    else:
        url = f"{BASE_URL}/stage-{stage_number}/result"
    
    print(f"Fetching results for Stage {stage_number} from {url}...")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
        session = requests.Session()
        session.headers.update(headers)
        response = session.get(url, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the results table
        # ProCyclingStats typically uses a table with class "results" or similar
        results_table = soup.find('table', class_='results') or soup.find('table', id='results')
        
        if not results_table:
            # Try alternative selectors
            results_table = soup.find('table')
        
        if not results_table:
            print(f"  Warning: Could not find results table for Stage {stage_number}")
            return []
        
        results = []
        rows = results_table.find_all('tr')[1:]  # Skip header row
        
        for idx, row in enumerate(rows, start=1):
            cells = row.find_all(['td', 'th'])
            if len(cells) < 2:
                continue
            
            # Extract position (usually first column)
            position = idx
            
            # Extract rider name (usually in a link or specific cell)
            rider_name_cell = None
            for cell in cells:
                link = cell.find('a')
                if link and ('rider' in link.get('href', '') or 'cyclist' in link.get('href', '')):
                    rider_name_cell = cell
                    break
            
            if not rider_name_cell:
                # Try to find any cell with text that looks like a name
                for cell in cells:
                    text = cell.get_text(strip=True)
                    if text and not text.isdigit() and len(text) > 3:
                        rider_name_cell = cell
                        break
            
            if rider_name_cell:
                rider_name = rider_name_cell.get_text(strip=True)
                # Clean up name (remove extra whitespace, numbers, etc.)
                rider_name = re.sub(r'\s+', ' ', rider_name).strip()
                
                # Extract time (if available)
                time_str = None
                time_seconds = None
                for cell in cells:
                    text = cell.get_text(strip=True)
                    # Look for time format like "4:23:45" or "+0:00"
                    if ':' in text and ('+' in text or re.match(r'\d+:\d+:\d+', text)):
                        time_str = text
                        break
                
                if time_str:
                    # Parse time to seconds
                    time_seconds = parse_time_to_seconds(time_str)
                
                # Determine same_time_group (riders with same time get same group number)
                same_time_group = None
                if time_str and not time_str.startswith('+'):
                    # Winner or same time as winner
                    same_time_group = 1
                elif time_str and time_str.startswith('+'):
                    # Time behind - extract group if multiple riders have same time
                    same_time_group = None  # Would need to group by time
                
                results.append((rider_name, position, time_seconds, same_time_group))
        
        print(f"  Found {len(results)} results for Stage {stage_number}")
        return results
        
    except requests.RequestException as e:
        print(f"  Error fetching Stage {stage_number}: {e}")
        return []
    except Exception as e:
        print(f"  Error parsing Stage {stage_number}: {e}")
        return []

def parse_time_to_seconds(time_str):
    """Parse time string (e.g., '4:23:45' or '+0:12:34') to total seconds"""
    try:
        # Remove '+' if present
        time_str = time_str.replace('+', '').strip()
        
        # Split by ':'
        parts = time_str.split(':')
        if len(parts) == 3:  # HH:MM:SS
            hours, minutes, seconds = map(int, parts)
            return hours * 3600 + minutes * 60 + seconds
        elif len(parts) == 2:  # MM:SS
            minutes, seconds = map(int, parts)
            return minutes * 60 + seconds
        else:
            return None
    except:
        return None

def match_rider_name_to_database(rider_name, riders_csv_path='riders.csv'):
    """
    Match rider name from procyclingstats to database rider ID
    Returns rider_id if found, None otherwise
    """
    try:
        with open(riders_csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                db_first = row.get('first_name', '').strip()
                db_last = row.get('last_name', '').strip()
                db_full = f"{db_first} {db_last}".strip()
                
                # Try exact match
                if rider_name.lower() == db_full.lower():
                    return None  # Would need rider ID from database
                
                # Try matching last name
                if rider_name.split()[-1].lower() == db_last.lower():
                    return None  # Would need rider ID from database
    except:
        pass
    
    return None

def generate_sql_inserts(stage_number, results, output_file):
    """
    Generate SQL INSERT statements for stage_results
    Note: This requires rider_id from database, so we'll generate a template
    """
    with open(output_file, 'a', encoding='utf-8') as f:
        f.write(f"\n-- Stage {stage_number} Results\n")
        f.write(f"-- Total riders: {len(results)}\n\n")
        
        for rider_name, position, time_seconds, same_time_group in results:
            # Generate SQL that matches rider by name
            time_sql = f"{time_seconds}" if time_seconds else "NULL"
            group_sql = f"{same_time_group}" if same_time_group else "NULL"
            
            f.write(f"""INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  {position} as position,
  {time_sql} as time_seconds,
  {group_sql} as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = {stage_number}
  AND (
    (r.first_name || ' ' || r.last_name) ILIKE '%{rider_name.replace("'", "''")}%'
    OR r.last_name ILIKE '%{rider_name.split()[-1].replace("'", "''")}%'
  )
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position,
  time_seconds = EXCLUDED.time_seconds,
  same_time_group = EXCLUDED.same_time_group;

""")

def main():
    """Main function to fetch all stage results"""
    print("Fetching Tour de France 2025 stage results from procyclingstats.com...")
    print("=" * 70)
    
    output_file = 'import-stage-results-procyclingstats.sql'
    
    # Clear output file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- SQL Script to import stage_results from procyclingstats.com\n")
        f.write("-- Generated automatically by fetch-stage-results-procyclingstats.py\n")
        f.write("-- IMPORTANT: Make sure stages and riders are imported first\n\n")
    
    # Fetch results for all 21 stages
    all_stages = list(range(1, 22))  # Stages 1-21
    
    for stage_num in all_stages:
        results = fetch_stage_results(stage_num)
        if results:
            generate_sql_inserts(stage_num, results, output_file)
        
        # Be polite - wait between requests
        time.sleep(2)
    
    print("\n" + "=" * 70)
    print(f"Results written to {output_file}")
    print("\nNote: You may need to manually adjust rider name matching")
    print("      as names might differ between procyclingstats and your database.")

if __name__ == "__main__":
    main()

