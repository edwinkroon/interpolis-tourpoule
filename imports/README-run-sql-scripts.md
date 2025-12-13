# Hoe SQL Scripts Uitvoeren

## Optie 1: Node.js Script (Aanbevolen voor lokale Docker database)

1. **Zorg dat je database URL is ingesteld:**
   ```powershell
   # Voor lokale Docker database
   $env:DATABASE_URL="postgresql://postgres:password@localhost:5432/dbname"
   ```

2. **Voer het script uit:**
   ```powershell
   node imports/run-sql-script.js imports/update-stages-2025.sql
   ```

3. **Het script:**
   - Leest automatisch je database configuratie uit environment variables
   - Voert het SQL script uit
   - Toont eventuele fouten
   - Sluit de verbinding netjes af

## Optie 2: Via psql Command Line (Geavanceerd)

Als je `psql` hebt geïnstalleerd:

```powershell
# Voor lokale Docker database
$env:PGPASSWORD="password"
psql -h localhost -U postgres -d dbname -f imports/update-stages-2025.sql

# Of met connection string
psql "postgresql://postgres:password@localhost:5432/dbname" -f imports/update-stages-2025.sql
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

- **Optie 1 (Node.js Script)** is het eenvoudigst voor lokale Docker database
- **Optie 2 (psql)** is handig als je veel scripts moet uitvoeren
- **Optie 3 (Python)** is handig voor geautomatiseerde imports

## Belangrijke Opmerkingen

- Het script gebruikt `ON CONFLICT`, dus het is veilig om meerdere keren uit te voeren
- Zorg dat je eerst de `teams_pro` tabel hebt gevuld (als die nodig is)
- Het script zal bestaande stages updaten als ze al bestaan
- Controleer altijd de output voor eventuele errors


