# Hoe SQL Scripts Uitvoeren

## Optie 1: Neon SQL Editor (Aanbevolen - Eenvoudigst)

1. **Ga naar Neon Dashboard:**
   - Open https://console.neon.tech
   - Log in met je account
   - Selecteer je project (bijv. "neondb")

2. **Open SQL Editor:**
   - Klik op "SQL Editor" in het linkermenu
   - Of gebruik de directe link naar je database

3. **Kopieer en plak het script:**
   - Open het SQL bestand in Cursor (bijv. `imports/import-stages-2025.sql`)
   - Selecteer alle tekst (Ctrl+A)
   - Kopieer (Ctrl+C)
   - Plak in de Neon SQL Editor (Ctrl+V)

4. **Voer het script uit:**
   - Klik op de "Run" knop
   - Of druk op `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Wacht tot het script klaar is

5. **Controleer de resultaten:**
   - Het script bevat verificatie queries aan het einde
   - Je ziet het aantal geïmporteerde stages en een overzicht

## Optie 2: Via psql Command Line (Geavanceerd)

Als je `psql` hebt geïnstalleerd:

```bash
# Zet de database URL als environment variable
$env:NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2HT1WlErIqxp@ep-little-unit-aemp2fsn-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

# Voer het script uit
psql $env:NEON_DATABASE_URL -f imports/import-stages-2025.sql
```

## Optie 3: Via Python Script (Alternatief)

Je kunt ook een Python script maken dat het SQL bestand leest en uitvoert:

```python
import psycopg2
import os

# Lees database URL
DATABASE_URL = os.getenv('NEON_DATABASE_URL')

# Verbind met database
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Lees SQL bestand
with open('imports/import-stages-2025.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Voer uit
cur.execute(sql)
conn.commit()

# Sluit verbinding
cur.close()
conn.close()
```

## Welke Optie Te Gebruiken?

- **Optie 1 (Neon SQL Editor)** is het eenvoudigst en wordt aanbevolen
- **Optie 2 (psql)** is handig als je veel scripts moet uitvoeren
- **Optie 3 (Python)** is handig voor geautomatiseerde imports

## Belangrijke Opmerkingen

- Het script gebruikt `ON CONFLICT`, dus het is veilig om meerdere keren uit te voeren
- Zorg dat je eerst de `teams_pro` tabel hebt gevuld (als die nodig is)
- Het script zal bestaande stages updaten als ze al bestaan
- Controleer altijd de output voor eventuele errors


