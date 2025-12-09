# Stage Results Import Guide

## Option 1: Using the Python Script (Automated)

Het script `fetch-stage-results-procyclingstats.py` haalt automatisch alle resultaten op van procyclingstats.com.

### Vereisten:
```bash
pip install requests beautifulsoup4
```

### Gebruik:
```bash
cd imports
python fetch-stage-results-procyclingstats.py
```

Dit genereert een SQL bestand `import-stage-results-procyclingstats.sql` met alle resultaten.

**Let op:** Web scraping kan tegen de terms of service van procyclingstats zijn. Gebruik dit verantwoordelijk en respecteer hun robots.txt.

## Option 2: Manual Import (Aanbevolen)

Als je toegang hebt tot de volledige resultaten (bijvoorbeeld via een export of API):

1. Download de resultaten per etappe van procyclingstats.com
2. Zet deze om naar een CSV formaat met kolommen:
   - `stage_number`
   - `rider_first_name`
   - `rider_last_name`
   - `position`
   - `time_seconds` (optioneel)
   - `same_time_group` (optioneel)

3. Gebruik het template script `import-stage-results-template.sql` en pas deze aan

## Option 3: Direct SQL Import

Als je de data al hebt in een andere vorm, kun je direct SQL INSERT statements maken:

```sql
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
SELECT 
  s.id as stage_id,
  r.id as rider_id,
  [POSITION] as position,
  [TIME_SECONDS] as time_seconds,
  [SAME_TIME_GROUP] as same_time_group
FROM stages s
CROSS JOIN riders r
WHERE s.stage_number = [STAGE_NUMBER]
  AND r.first_name = '[FIRST_NAME]' AND r.last_name = '[LAST_NAME]'
ON CONFLICT (stage_id, rider_id) DO UPDATE SET
  position = EXCLUDED.position,
  time_seconds = EXCLUDED.time_seconds,
  same_time_group = EXCLUDED.same_time_group;
```

## Data Structuur

De `stage_results` tabel heeft de volgende structuur:
- `stage_id` - Foreign key naar stages tabel
- `rider_id` - Foreign key naar riders tabel  
- `position` - Finispositie (1 = winnaar, 2 = tweede, etc.)
- `time_seconds` - Tijd in seconden (optioneel)
- `same_time_group` - Groep nummer voor renners met dezelfde tijd (optioneel)

## Verificatie

Na import, controleer de data:

```sql
-- Check aantal resultaten per etappe
SELECT 
  s.stage_number,
  s.name,
  COUNT(sr.id) as result_count
FROM stages s
LEFT JOIN stage_results sr ON s.id = sr.stage_id
WHERE s.date >= '2025-07-01'
GROUP BY s.id, s.stage_number, s.name
ORDER BY s.stage_number;

-- Check winnaars per etappe
SELECT 
  s.stage_number,
  s.name,
  r.first_name || ' ' || r.last_name as winner,
  sr.position
FROM stages s
INNER JOIN stage_results sr ON s.id = sr.stage_id
INNER JOIN riders r ON sr.rider_id = r.id
WHERE s.date >= '2025-07-01' AND sr.position = 1
ORDER BY s.stage_number;
```

