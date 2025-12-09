"""
Script om etappe uitslag te importeren in stage_results
Handelt ook renners af die de finish niet hebben gehaald (DNF, DNS, DSQ, etc.)
"""

import csv
import re
import unicodedata

def normalize_name(name):
    """Normaliseer naam door diakrieten te verwijderen"""
    if not name:
        return ""
    nfd = unicodedata.normalize('NFD', name)
    return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn').lower().strip()

def parse_time(time_str):
    """Parse tijd string naar seconden (bijv. '3:53:11' -> 13991)"""
    if not time_str or time_str.strip() == '':
        return None
    
    # Verwijder extra whitespace
    time_str = time_str.strip()
    
    # Check voor speciale status (DNF, DNS, DSQ, etc.)
    if time_str.upper() in ['DNF', 'DNS', 'DSQ', 'OTL', 'DNF*', 'DNS*']:
        return None
    
    # Parse tijd formaten: "3:53:11" of "13991" of "3h53m11s"
    try:
        # Als het al een getal is (seconden)
        if time_str.isdigit():
            return int(time_str)
        
        # Format: HH:MM:SS
        if ':' in time_str:
            parts = time_str.split(':')
            if len(parts) == 3:
                hours, minutes, seconds = map(int, parts)
                return hours * 3600 + minutes * 60 + seconds
            elif len(parts) == 2:
                minutes, seconds = map(int, parts)
                return minutes * 60 + seconds
        
        # Format: XhYmZs
        match = re.match(r'(\d+)h\s*(\d+)m\s*(\d+)s', time_str, re.IGNORECASE)
        if match:
            hours, minutes, seconds = map(int, match.groups())
            return hours * 3600 + minutes * 60 + seconds
        
    except (ValueError, AttributeError):
        pass
    
    return None

def detect_dnf_status(name_or_time):
    """Detecteer of een renner de finish niet heeft gehaald"""
    if not name_or_time:
        return False, None
    
    status_codes = {
        'DNF': 'DNF',  # Did Not Finish
        'DNS': 'DNS',  # Did Not Start
        'DSQ': 'DSQ',  # Disqualified
        'OTL': 'OTL',  # Outside Time Limit
        'DNF*': 'DNF',
        'DNS*': 'DNS'
    }
    
    upper_str = str(name_or_time).upper().strip()
    for code, status in status_codes.items():
        if code in upper_str:
            return True, status
    
    return False, None

# Lees het bestand - probeer eerst temp, dan CSV als fallback
input_file = 'temp/uitslag etappe 1.txt'
fallback_file = 'imports/etappe-1-uitslag.csv'
content = None
is_csv = False

try:
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if not content or len(content.strip()) == 0:
        print(f"⚠️  Bestand {input_file} is leeg, probeer fallback: {fallback_file}")
        # Probeer CSV als fallback
        try:
            with open(fallback_file, 'r', encoding='utf-8') as f:
                content = f.read()
            is_csv = True
            print(f"✓ Fallback bestand gelezen: {len(content)} karakters (CSV formaat)")
        except FileNotFoundError:
            print(f"❌ Geen van beide bestanden gevonden")
            exit(1)
    else:
        print(f"✓ Bestand gelezen: {len(content)} karakters")
    
except FileNotFoundError:
    print(f"⚠️  Bestand {input_file} niet gevonden, probeer fallback: {fallback_file}")
    try:
        with open(fallback_file, 'r', encoding='utf-8') as f:
            content = f.read()
        is_csv = True
        print(f"✓ Fallback bestand gelezen: {len(content)} karakters (CSV formaat)")
    except FileNotFoundError:
        print(f"❌ Geen van beide bestanden gevonden")
        exit(1)
except Exception as e:
    print(f"❌ Fout bij lezen bestand: {e}")
    exit(1)

# Parse de uitslag
riders = []

print(f"\n{'='*80}")
print("PARSING UITSLAG")
print(f"{'='*80}")

# Als het CSV is, gebruik CSV parser
if is_csv:
    import io
    csv_reader = csv.DictReader(io.StringIO(content))
    for row in csv_reader:
        time_str = row.get('time_seconds', '').strip()
        # Als time_seconds al een getal is, gebruik dat direct
        try:
            time_seconds = int(time_str) if time_str else None
        except ValueError:
            time_seconds = parse_time(time_str)
        
        rider_data = {
            'position': int(row.get('position', 0)),
            'first_name': row.get('first_name', '').strip(),
            'last_name': row.get('last_name', '').strip(),
            'time': time_str,
            'time_seconds': time_seconds
        }
        if rider_data['position'] > 0:
            riders.append(rider_data)
else:
    # Parse tekst formaat
    lines = content.strip().split('\n')
    for i, line in enumerate(lines, 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        
        # Probeer verschillende formaten te parsen
        # Format 1: CSV: position,first_name,last_name,time
        # Format 2: Tekst: "1. Jasper Philipsen 3:53:11"
        # Format 3: Tab gescheiden
        
        rider_data = {}
        
        # Probeer CSV formaat
        if ',' in line:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                try:
                    rider_data['position'] = int(parts[0])
                    rider_data['first_name'] = parts[1]
                    rider_data['last_name'] = parts[2]
                    rider_data['time'] = parts[3] if len(parts) > 3 else ''
                except ValueError:
                    continue
        
        # Probeer tekst formaat: "1. Jasper Philipsen 3:53:11" of "1 Jasper Philipsen 3:53:11"
        elif re.match(r'^\d+[\.\)]\s+', line) or re.match(r'^\d+\s+', line):
            match = re.match(r'^(\d+)[\.\)]?\s+(.+?)\s+((?:\d+[:h])?\d+[:m]?\d+[s]?|DNF|DNS|DSQ|OTL)', line)
            if match:
                rider_data['position'] = int(match.group(1))
                name_parts = match.group(2).strip().split()
                if len(name_parts) >= 2:
                    rider_data['first_name'] = name_parts[0]
                    rider_data['last_name'] = ' '.join(name_parts[1:])
                else:
                    rider_data['first_name'] = name_parts[0] if name_parts else ''
                    rider_data['last_name'] = ''
                rider_data['time'] = match.group(3)
            else:
                # Simpel formaat: positie naam tijd
                parts = line.split()
                if len(parts) >= 3:
                    try:
                        rider_data['position'] = int(parts[0])
                        # Laatste deel is tijd, rest is naam
                        rider_data['time'] = parts[-1]
                        name_parts = parts[1:-1]
                        if len(name_parts) >= 2:
                            rider_data['first_name'] = name_parts[0]
                            rider_data['last_name'] = ' '.join(name_parts[1:])
                        else:
                            rider_data['first_name'] = name_parts[0] if name_parts else ''
                            rider_data['last_name'] = ''
                    except ValueError:
                        continue
        
        # Probeer tab gescheiden
        elif '\t' in line:
            parts = [p.strip() for p in line.split('\t')]
            if len(parts) >= 3:
                try:
                    rider_data['position'] = int(parts[0])
                    rider_data['first_name'] = parts[1]
                    rider_data['last_name'] = parts[2]
                    rider_data['time'] = parts[3] if len(parts) > 3 else ''
                except ValueError:
                    continue
        
        if rider_data and 'position' in rider_data:
            riders.append(rider_data)

if not riders:
    print("❌ Geen renners gevonden in het bestand")
    print("\nVoorbeeld formaten die ondersteund worden:")
    print("  1. CSV: 1,Jasper,Philipsen,3:53:11")
    print("  2. Tekst: 1. Jasper Philipsen 3:53:11")
    print("  3. Tab: 1\tJasper\tPhilipsen\t3:53:11")
    exit(1)

print(f"✓ {len(riders)} renners gevonden")

# Analyseer renners die de finish niet hebben gehaald
finished_riders = []
dnf_riders = []

for rider in riders:
    # Als time_seconds al is geparsed (bijv. van CSV), gebruik die
    if 'time_seconds' in rider and rider['time_seconds'] is not None:
        finished_riders.append(rider)
        continue
    
    time_str = rider.get('time', '')
    is_dnf, status = detect_dnf_status(time_str)
    
    if is_dnf or not time_str or time_str.strip() == '':
        dnf_riders.append({
            **rider,
            'status': status or 'DNF',
            'time_seconds': None
        })
    else:
        time_seconds = parse_time(time_str)
        if time_seconds is not None:
            finished_riders.append({
                **rider,
                'time_seconds': time_seconds
            })
        else:
            dnf_riders.append({
                **rider,
                'status': 'DNF',
                'time_seconds': None
            })

print(f"\n{'='*80}")
print("ANALYSE:")
print(f"{'='*80}")
print(f"  ✓ Finish gehaald: {len(finished_riders)}")
print(f"  ✗ Finish niet gehaald: {len(dnf_riders)}")

if dnf_riders:
    print(f"\n  Renners die finish niet hebben gehaald:")
    for rider in dnf_riders[:10]:  # Toon eerste 10
        print(f"    Pos {rider['position']}: {rider['first_name']} {rider['last_name']} - {rider['status']}")
    if len(dnf_riders) > 10:
        print(f"    ... en {len(dnf_riders) - 10} meer")

# Vraag gebruiker wat te doen met DNF renners
print(f"\n{'='*80}")
print("VRAAG:")
print(f"{'='*80}")
print("Wat wil je doen met renners die de finish niet hebben gehaald?")
print("  1. NIET toevoegen aan stage_results (alleen finishers)")
print("  2. WEL toevoegen met NULL time_seconds (voor statistieken)")
print("  3. WEL toevoegen met speciale positie (bijv. 999 voor DNF)")

choice = input("\nKies optie (1/2/3) [standaard: 1]: ").strip() or "1"

# Genereer SQL script
sql_content = f"""-- SQL Script to import Stage 1 results from temp/uitslag etappe 1.txt
-- Generated automatically
-- Total riders: {len(riders)} ({len(finished_riders)} finished, {len(dnf_riders)} DNF/DNS/DSQ)

-- First, verify that Stage 1 exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stages WHERE stage_number = 1) THEN
    RAISE EXCEPTION 'Stage 1 does not exist. Please run full-reset-and-import.sql first.';
  END IF;
END $$;

-- Clear existing Stage 1 results
DELETE FROM stage_results WHERE stage_id = (SELECT id FROM stages WHERE stage_number = 1);

-- Insert Stage 1 results
-- Uses rider_id lookup by name if not provided
-- Calculates same_time_group based on time_seconds
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
WITH stage_data AS (
  SELECT 
    s.id as stage_id,
    v.position,
    v.first_name,
    v.last_name,
    v.time_seconds,
    -- Calculate same_time_group: assign group number based on time_seconds
    DENSE_RANK() OVER (ORDER BY v.time_seconds NULLS LAST) as time_group
  FROM stages s
  CROSS JOIN (VALUES
"""

# Voeg finished riders toe
values = []
for rider in finished_riders:
    first_name = rider['first_name'].replace("'", "''")
    last_name = rider['last_name'].replace("'", "''")
    time_seconds = rider['time_seconds']
    pos = rider['position']
    values.append(f"    ({pos}, '{first_name}', '{last_name}', {time_seconds})")

# Voeg DNF renners toe afhankelijk van keuze
if choice == "2":
    # Toevoegen met NULL time
    for rider in dnf_riders:
        first_name = rider['first_name'].replace("'", "''")
        last_name = rider['last_name'].replace("'", "''")
        pos = rider['position']
        values.append(f"    ({pos}, '{first_name}', '{last_name}', NULL)")
    print(f"\n✓ DNF renners worden toegevoegd met NULL time_seconds")
elif choice == "3":
    # Toevoegen met speciale positie (999+)
    dnf_position = 999
    for rider in dnf_riders:
        first_name = rider['first_name'].replace("'", "''")
        last_name = rider['last_name'].replace("'", "''")
        values.append(f"    ({dnf_position}, '{first_name}', '{last_name}', NULL)")
        dnf_position += 1
    print(f"\n✓ DNF renners worden toegevoegd met positie 999+")
else:
    print(f"\n✓ DNF renners worden NIET toegevoegd (alleen finishers)")

sql_content += ',\n'.join(values)
sql_content += """
  ) AS v(position, first_name, last_name, time_seconds)
  WHERE s.stage_number = 1
),
rider_lookup AS (
  SELECT 
    sd.*,
    (
      SELECT r.id 
      FROM riders r 
      WHERE LOWER(TRIM(r.first_name)) = LOWER(TRIM(sd.first_name))
        AND LOWER(TRIM(r.last_name)) = LOWER(TRIM(sd.last_name))
      LIMIT 1
    ) as rider_id
  FROM stage_data sd
)
SELECT DISTINCT ON (stage_id, rider_id)
  stage_id,
  rider_id,
  position,
  time_seconds,
  time_group as same_time_group
FROM rider_lookup
WHERE rider_id IS NOT NULL
ORDER BY stage_id, rider_id, position
ON CONFLICT (stage_id, rider_id) 
DO UPDATE SET
  position = EXCLUDED.position,
  time_seconds = EXCLUDED.time_seconds,
  same_time_group = EXCLUDED.same_time_group;

-- Verify the import
SELECT 
  COUNT(*) as total_results,
  COUNT(DISTINCT rider_id) as unique_riders,
  COUNT(DISTINCT same_time_group) as time_groups,
  COUNT(*) FILTER (WHERE time_seconds IS NULL) as dnf_count
FROM stage_results
WHERE stage_id = (SELECT id FROM stages WHERE stage_number = 1);
"""

# Sla SQL script op
output_file = 'imports/import-etappe-1-from-temp.sql'
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(sql_content)

print(f"\n{'='*80}")
print("RESULTAAT:")
print(f"{'='*80}")
print(f"✅ SQL script gegenereerd: {output_file}")
print(f"   - {len(finished_riders)} renners met tijd")
if choice != "1":
    print(f"   - {len(dnf_riders)} renners zonder tijd (DNF/DNS/DSQ)")
print(f"\n   Volgende stap: Run het SQL script in je database")

