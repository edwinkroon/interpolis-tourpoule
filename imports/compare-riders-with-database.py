"""
Compare riders from etappe-1-uitslag.csv with database/riders.csv
"""

import csv
import unicodedata

def normalize_name(name):
    """Normaliseer naam door diakrieten te verwijderen en lowercase"""
    if not name:
        return ""
    nfd = unicodedata.normalize('NFD', name)
    normalized = ''.join(c for c in nfd if unicodedata.category(c) != 'Mn').lower().strip()
    return normalized

# Read database riders
db_riders = {}
db_riders_by_id = {}
with open('database_csv/riders.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rider_id = row.get('id', '').strip()
        first_name = row.get('first_name', '').strip()
        last_name = row.get('last_name', '').strip()
        
        if rider_id:
            db_riders_by_id[int(rider_id)] = {
                'id': int(rider_id),
                'first_name': first_name,
                'last_name': last_name,
                'first_name_normalized': normalize_name(first_name),
                'last_name_normalized': normalize_name(last_name)
            }
        
        # Create lookup key by normalized name
        key = (normalize_name(first_name), normalize_name(last_name))
        if key not in db_riders:
            db_riders[key] = []
        db_riders[key].append({
            'id': int(rider_id) if rider_id else None,
            'first_name': first_name,
            'last_name': last_name
        })

print(f"✓ {len(db_riders_by_id)} renners gelezen uit database")

# Read stage results
stage_riders = []
with open('imports/etappe-1-uitslag.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        stage_riders.append({
            'position': row.get('position', '').strip(),
            'first_name': row.get('first_name', '').strip(),
            'last_name': row.get('last_name', '').strip(),
            'rider_id': row.get('rider_id', '').strip(),
            'time_seconds': row.get('time_seconds', '').strip()
        })

print(f"✓ {len(stage_riders)} renners gelezen uit etappe-1-uitslag.csv")

# Compare
matched = []
unmatched = []
matched_by_id = []
matched_by_name = []
id_mismatch = []

for rider in stage_riders:
    first_name = rider['first_name']
    last_name = rider['last_name']
    rider_id = rider['rider_id']
    
    # Normalize names
    first_norm = normalize_name(first_name)
    last_norm = normalize_name(last_name)
    key = (first_norm, last_norm)
    
    # Check if rider_id is provided
    if rider_id:
        rider_id_int = int(rider_id)
        if rider_id_int in db_riders_by_id:
            db_rider = db_riders_by_id[rider_id_int]
            # Verify name matches
            if (normalize_name(db_rider['first_name']) == first_norm and 
                normalize_name(db_rider['last_name']) == last_norm):
                matched_by_id.append({
                    'position': rider['position'],
                    'stage_name': f"{first_name} {last_name}",
                    'db_name': f"{db_rider['first_name']} {db_rider['last_name']}",
                    'rider_id': rider_id_int,
                    'match_type': 'ID + Name'
                })
            else:
                id_mismatch.append({
                    'position': rider['position'],
                    'stage_name': f"{first_name} {last_name}",
                    'db_name': f"{db_riders_by_id[rider_id_int]['first_name']} {db_riders_by_id[rider_id_int]['last_name']}",
                    'rider_id': rider_id_int,
                    'issue': 'ID exists but name does not match'
                })
        else:
            # ID provided but not in database
            if key in db_riders:
                # Name matches but ID is wrong
                db_matches = db_riders[key]
                id_mismatch.append({
                    'position': rider['position'],
                    'stage_name': f"{first_name} {last_name}",
                    'provided_id': rider_id_int,
                    'db_matches': db_matches,
                    'issue': 'ID not in database, but name matches'
                })
            else:
                unmatched.append({
                    'position': rider['position'],
                    'name': f"{first_name} {last_name}",
                    'rider_id': rider_id,
                    'issue': 'ID not in database and name does not match'
                })
    else:
        # No rider_id provided, try to match by name
        if key in db_riders:
            db_matches = db_riders[key]
            if len(db_matches) == 1:
                matched_by_name.append({
                    'position': rider['position'],
                    'stage_name': f"{first_name} {last_name}",
                    'db_name': f"{db_matches[0]['first_name']} {db_matches[0]['last_name']}",
                    'rider_id': db_matches[0]['id'],
                    'match_type': 'Name only'
                })
            else:
                matched_by_name.append({
                    'position': rider['position'],
                    'stage_name': f"{first_name} {last_name}",
                    'db_matches': db_matches,
                    'match_type': 'Name (multiple matches)'
                })
        else:
            unmatched.append({
                'position': rider['position'],
                'name': f"{first_name} {last_name}",
                'rider_id': None,
                'issue': 'No ID provided and name does not match'
            })

# Print results
print(f"\n{'='*80}")
print("VERGELIJKING RESULTATEN")
print(f"{'='*80}")
print(f"\n✓ Gematched door ID + Naam: {len(matched_by_id)}")
print(f"✓ Gematched door Naam alleen: {len(matched_by_name)}")
print(f"⚠️  ID mismatch: {len(id_mismatch)}")
print(f"❌ Niet gematched: {len(unmatched)}")

total_matched = len(matched_by_id) + len(matched_by_name)
print(f"\n📊 Totaal: {len(stage_riders)} renners")
print(f"   - Gematched: {total_matched} ({total_matched*100/len(stage_riders):.1f}%)")
print(f"   - Problemen: {len(id_mismatch) + len(unmatched)} ({((len(id_mismatch) + len(unmatched))*100/len(stage_riders)):.1f}%)")

# Show ID mismatches
if id_mismatch:
    print(f"\n{'='*80}")
    print("ID MISMATCHES:")
    print(f"{'='*80}")
    for item in id_mismatch[:20]:  # Show first 20
        print(f"\nPos {item['position']}: {item['stage_name']}")
        print(f"  Issue: {item['issue']}")
        if 'db_name' in item:
            print(f"  Database: {item['db_name']} (ID: {item['rider_id']})")
        if 'provided_id' in item:
            print(f"  Provided ID: {item['provided_id']}")
            print(f"  Database matches: {len(item['db_matches'])} found")
            for match in item['db_matches']:
                print(f"    - {match['first_name']} {match['last_name']} (ID: {match['id']})")
    if len(id_mismatch) > 20:
        print(f"\n  ... en {len(id_mismatch) - 20} meer")

# Show unmatched
if unmatched:
    print(f"\n{'='*80}")
    print("NIET GEMATCHED:")
    print(f"{'='*80}")
    for item in unmatched[:30]:  # Show first 30
        print(f"Pos {item['position']}: {item['name']} (ID: {item['rider_id'] or 'geen'}) - {item['issue']}")
    if len(unmatched) > 30:
        print(f"\n  ... en {len(unmatched) - 30} meer")

# Show some matched examples
if matched_by_id:
    print(f"\n{'='*80}")
    print("VOORBEELDEN GEMATCHED (ID + Naam):")
    print(f"{'='*80}")
    for item in matched_by_id[:5]:
        print(f"Pos {item['position']}: {item['stage_name']} (ID: {item['rider_id']}) ✓")

if matched_by_name:
    print(f"\n{'='*80}")
    print("VOORBEELDEN GEMATCHED (Naam alleen):")
    print(f"{'='*80}")
    for item in matched_by_name[:5]:
        if 'db_matches' in item:
            print(f"Pos {item['position']}: {item['stage_name']} - {len(item['db_matches'])} matches in database")
        else:
            print(f"Pos {item['position']}: {item['stage_name']} → {item['db_name']} (ID: {item['rider_id']}) ✓")

# Generate summary report
print(f"\n{'='*80}")
print("SAMENVATTING:")
print(f"{'='*80}")
print(f"✅ Perfect match (ID + Naam): {len(matched_by_id)}")
print(f"✅ Match op naam: {len(matched_by_name)}")
print(f"⚠️  Problemen: {len(id_mismatch)}")
print(f"❌ Niet gevonden: {len(unmatched)}")

