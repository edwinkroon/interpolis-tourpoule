"""
Fix rider_id's in etappe-1-uitslag.csv by matching with database riders
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

# Known typos to fix
TYPO_CORRECTIONS = {
    'Mathieu': {'van der Po&': 'van der Poel'},
    'Rem++': 'Remco',
    'Primo+': 'Primoz',
    'Staff': 'Steff',
    'Bastion': 'Bastien',
    'Vito': {'Brant': 'Braet'},
    'Anders': {'Johannessen': 'Halland Johannessen'},
    'Thyme+': 'Thymen',
    'Gregor': {'Muehlberger': 'Muhlberger'},
    'Einar': 'Einer',
    'Frank': {'van den Brook': 'Van Den Broek'},
    'Ro&': 'Roel',
    'William': {'Barta': 'Barta'},  # Will Barta
}

# Special name mappings (exact matches that need manual mapping)
SPECIAL_MAPPINGS = {
    ('Mattis', 'Cattaneo'): ('Mattia', 'Cattaneo', 18),
    ('Aurelian', 'Paret-Peintre'): ('Aurelien', 'Paret-Peintre', 126),
    ('Edward', 'Dunbar'): ('Eddie', 'Dunbar', 98),
    ('Lucas', 'Plapp'): ('Luke', 'Plapp', 102),
    ('Sebastian', 'Grignard'): ('Sebastien', 'Grignard', 173),
    ('Anders', 'Halland Johannessen'): ('Anders Halland', 'Johannessen', 182),
    ('Anders', 'Johannessen'): ('Anders Halland', 'Johannessen', 182),  # Alternative format
    ('Tobias', 'Johannessen'): ('Tobias Halland', 'Johannessen', 177),  # or 182 for Anders
    ('Jonas', 'Abrahamson'): ('Jonas', 'Abrahamsen', 178),
    ('Niklas', 'Maerkl'): ('Niklas', 'Markl', 158),
    ('Enric', 'Mas'): ('Enric Mondiale Team', 'Mas', 113),  # Database has wrong name
    ('Søren', 'Wærenskjold'): ('Soren', 'Waerenskjold', 184),
    ('Han', 'van Wilder'): ('Ilan', 'Van Wilder', 24),  # Different person, but likely match
}

# Read database riders
db_riders_by_name = {}
db_riders_by_id = {}
with open('database_csv/riders.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rider_id = row.get('id', '').strip()
        first_name = row.get('first_name', '').strip()
        last_name = row.get('last_name', '').strip()
        
        if rider_id:
            rider_id_int = int(rider_id)
            db_riders_by_id[rider_id_int] = {
                'id': rider_id_int,
                'first_name': first_name,
                'last_name': last_name
            }
            
            # Create lookup by normalized name
            key = (normalize_name(first_name), normalize_name(last_name))
            if key not in db_riders_by_name:
                db_riders_by_name[key] = []
            db_riders_by_name[key].append({
                'id': rider_id_int,
                'first_name': first_name,
                'last_name': last_name
            })

print(f"✓ {len(db_riders_by_id)} renners gelezen uit database")

# Read stage results
stage_riders = []
with open('imports/etappe-1-uitslag.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        stage_riders.append(row)

print(f"✓ {len(stage_riders)} renners gelezen uit etappe-1-uitslag.csv")

# Fix typos and find correct rider_id's
fixed_riders = []
corrections = []

for rider in stage_riders:
    first_name = rider['first_name'].strip()
    last_name = rider['last_name'].strip()
    provided_id = rider.get('rider_id', '').strip()
    
    # Fix typos
    original_first = first_name
    original_last = last_name
    
    # Check for special mappings first
    special_key = (original_first, original_last)
    if special_key in SPECIAL_MAPPINGS:
        first_name, last_name, correct_id = SPECIAL_MAPPINGS[special_key]
        match_type = f'Special mapping: {original_first} {original_last} → {first_name} {last_name} (ID: {correct_id})'
        fixed_rider = rider.copy()
        fixed_rider['first_name'] = first_name
        fixed_rider['last_name'] = last_name
        fixed_rider['rider_id'] = str(correct_id)
        fixed_rider['_name_corrected'] = True
        fixed_riders.append(fixed_rider)
        continue
    
    if first_name in TYPO_CORRECTIONS:
        if isinstance(TYPO_CORRECTIONS[first_name], dict):
            if last_name in TYPO_CORRECTIONS[first_name]:
                last_name = TYPO_CORRECTIONS[first_name][last_name]
        else:
            first_name = TYPO_CORRECTIONS[original_first]
    
    # Specific corrections
    if original_first == 'Rem++':
        first_name = 'Remco'
    elif original_first == 'Primo+':
        first_name = 'Primoz'
    elif original_first == 'Staff':
        first_name = 'Steff'
    elif original_first == 'Bastion':
        first_name = 'Bastien'
    elif original_first == 'Thyme+':
        first_name = 'Thymen'
    elif original_first == 'Einar':
        first_name = 'Einer'
    elif original_first == 'Ro&':
        first_name = 'Roel'
    elif original_first == 'William' and original_last == 'Barta':
        first_name = 'Will'
    
    # Normalize names for lookup
    first_norm = normalize_name(first_name)
    last_norm = normalize_name(last_name)
    key = (first_norm, last_norm)
    
    # Find correct rider_id
    correct_id = None
    match_type = None
    
    # First check if provided ID matches the name
    if provided_id:
        provided_id_int = int(provided_id)
        if provided_id_int in db_riders_by_id:
            db_rider = db_riders_by_id[provided_id_int]
            if (normalize_name(db_rider['first_name']) == first_norm and 
                normalize_name(db_rider['last_name']) == last_norm):
                correct_id = provided_id_int
                match_type = 'ID correct'
            else:
                # ID doesn't match name, need to find correct ID
                if key in db_riders_by_name:
                    matches = db_riders_by_name[key]
                    if len(matches) == 1:
                        correct_id = matches[0]['id']
                        match_type = f'ID corrected: {provided_id_int} → {correct_id}'
                        corrections.append({
                            'position': rider['position'],
                            'name': f"{original_first} {original_last}",
                            'old_id': provided_id_int,
                            'new_id': correct_id,
                            'db_name': f"{matches[0]['first_name']} {matches[0]['last_name']}"
                        })
                    else:
                        # Multiple matches - use first one
                        correct_id = matches[0]['id']
                        match_type = f'ID corrected (multiple matches): {provided_id_int} → {correct_id}'
                        corrections.append({
                            'position': rider['position'],
                            'name': f"{original_first} {original_last}",
                            'old_id': provided_id_int,
                            'new_id': correct_id,
                            'db_name': f"{matches[0]['first_name']} {matches[0]['last_name']}",
                            'note': f'{len(matches)} matches found'
                        })
                else:
                    match_type = f'ID {provided_id_int} does not match name, and name not found in DB'
        else:
            # Provided ID not in database, try to find by name
            if key in db_riders_by_name:
                matches = db_riders_by_name[key]
                if len(matches) == 1:
                    correct_id = matches[0]['id']
                    match_type = f'ID added: {provided_id_int} (not in DB) → {correct_id}'
                    corrections.append({
                        'position': rider['position'],
                        'name': f"{original_first} {original_last}",
                        'old_id': provided_id_int,
                        'new_id': correct_id,
                        'db_name': f"{matches[0]['first_name']} {matches[0]['last_name']}"
                    })
    else:
        # No ID provided, find by name
        if key in db_riders_by_name:
            matches = db_riders_by_name[key]
            if len(matches) == 1:
                correct_id = matches[0]['id']
                match_type = 'ID added by name'
            else:
                # Multiple matches
                correct_id = matches[0]['id']
                match_type = f'ID added (multiple matches, using first)'
    
    # Create fixed rider
    fixed_rider = rider.copy()
    fixed_rider['first_name'] = first_name
    fixed_rider['last_name'] = last_name
    fixed_rider['rider_id'] = str(correct_id) if correct_id else ''
    
    if original_first != first_name or original_last != last_name:
        fixed_rider['_name_corrected'] = True
    
    fixed_riders.append(fixed_rider)

# Write corrected CSV
output_file = 'imports/etappe-1-uitslag-fixed.csv'
with open(output_file, 'w', encoding='utf-8', newline='') as f:
    fieldnames = ['position', 'first_name', 'last_name', 'rider_id', 'team_name', 'time_seconds']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for rider in fixed_riders:
        row = {k: v for k, v in rider.items() if k in fieldnames}
        writer.writerow(row)

print(f"\n{'='*80}")
print("RESULTATEN:")
print(f"{'='*80}")
print(f"✓ Corrected CSV geschreven: {output_file}")

# Count statistics
with_id = sum(1 for r in fixed_riders if r.get('rider_id', '').strip())
without_id = len(fixed_riders) - with_id
name_corrected = sum(1 for r in fixed_riders if r.get('_name_corrected', False))

print(f"\n📊 Statistieken:")
print(f"   - Renners met rider_id: {with_id} ({with_id*100/len(fixed_riders):.1f}%)")
print(f"   - Renners zonder rider_id: {without_id} ({without_id*100/len(fixed_riders):.1f}%)")
print(f"   - Namen gecorrigeerd: {name_corrected}")

if corrections:
    print(f"\n⚠️  {len(corrections)} ID correcties:")
    for corr in corrections[:20]:
        print(f"   Pos {corr['position']}: {corr['name']}")
        print(f"      {corr['old_id']} → {corr['new_id']} ({corr['db_name']})")
    if len(corrections) > 20:
        print(f"   ... en {len(corrections) - 20} meer")

# Show unmatched
unmatched = [r for r in fixed_riders if not r.get('rider_id', '').strip()]
if unmatched:
    print(f"\n❌ {len(unmatched)} renners zonder rider_id:")
    for rider in unmatched[:15]:
        print(f"   Pos {rider['position']}: {rider['first_name']} {rider['last_name']}")
    if len(unmatched) > 15:
        print(f"   ... en {len(unmatched) - 15} meer")

