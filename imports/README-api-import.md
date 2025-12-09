# Stage Results Import via Neon PostgREST API

⚠️ **LET OP:** De Neon PostgREST API vereist authenticatie met een JWT token. Als je authenticatie problemen hebt, gebruik dan het **SQL script** (`import-stage-1-optimized.sql`) in plaats daarvan - dat werkt altijd en is sneller!

Dit script gebruikt de Neon PostgREST API om stage results direct in de database te importeren via HTTP requests.

## Vereisten

```bash
pip install requests
```

## Configuratie

### API Key / JWT Token - Waar vind je dit?

⚠️ **Belangrijk:** Neon PostgREST API vereist authenticatie. Er zijn verschillende opties:

#### Optie A: Service Role Key (Aanbevolen - als beschikbaar)

1. Ga naar [Neon Console](https://console.neon.tech/)
2. Selecteer je project
3. Ga naar **Settings** → **API** (of **Connection Details**)
4. Zoek naar **PostgREST API** of **Service Role Key**
5. Kopieer de key (begint meestal met `eyJ...` - dit is een JWT token)

**Let op:** Niet alle Neon projecten hebben een PostgREST API key beschikbaar in de console. Als je deze niet ziet, gebruik dan Optie B of C.

#### Optie B: Account API Key (Probeer dit eerst)

1. Ga naar [Neon Console](https://console.neon.tech/)
2. Klik op je profiel (rechtsboven) → **Account Settings**
3. Ga naar het tabblad **API Keys**
4. Klik op **Create New Key** of **Nieuwe sleutel aanmaken**
5. Geef de key een naam (bijv. "PostgREST API")
6. **Kopieer de key direct** - je ziet hem maar één keer!
7. Sla de key veilig op (bijv. in een password manager)

**Let op:** Deze key werkt mogelijk niet voor PostgREST. Als je een `401` of `400` error krijgt, gebruik dan Optie C.

#### Optie C: SQL Script gebruiken (Eenvoudigste optie)

Als je geen werkende API key kunt vinden, gebruik dan het **SQL script** in plaats daarvan:
- `import-stage-1-optimized.sql` - Werkt altijd, geen authenticatie nodig!

Dit script kun je direct in de Neon SQL Editor uitvoeren.

### Optie 1: Environment Variables (Aanbevolen)

Het script leest automatisch environment variables. Stel deze in:

**Voor Python:**
```bash
# Windows PowerShell
$env:NEON_API_KEY="netlify-999d7b0f-c91b-47f0-a445-7a1b83adc5f4-fb138f7833614c7f90c"
$env:NEON_API_URL="https://ep-little-unit-aemp2fsn.apirest.c-2.us-east-2.aws.neon.tech/neondb/rest/v1"

# Windows CMD
set NEON_API_KEY=netlify-999d7b0f-c91b-47f0-a445-7a1b83adc5f4-fb138f7833614c7f90c
set NEON_API_URL=https://ep-little-unit-aemp2fsn.apirest.c-2.us-east-2.aws.neon.tech/neondb/rest/v1

# Linux/Mac
export NEON_API_KEY="jnetlify-999d7b0f-c91b-47f0-a445-7a1b83adc5f4-fb138f7833614c7f90c"
export NEON_API_URL="https://ep-little-unit-aemp2fsn.apirest.c-2.us-east-2.aws.neon.tech/neondb/rest/v1"
```

**Voor Next.js/React/JavaScript:**
Voeg toe aan je `.env.local` of `.env` (alleen als API key nodig is):
```env
# Optioneel - alleen nodig als je 401 errors krijgt
NEON_API_KEY=jouw-api-key-hier
NEON_API_URL=https://ep-little-unit-aemp2fsn.apirest.c-2.us-east-2.aws.neon.tech/neondb/rest/v1
```

**Let op:** Als je geen API key hebt, laat `NEON_API_KEY` gewoon weg. Het script probeert eerst zonder authenticatie.

### Optie 2: Direct in Script (Niet aanbevolen)

Als je de key direct in het script wilt zetten, pas regel 15 aan:
```python
API_KEY = "jouw-api-key-hier"
```

## Gebruik

```bash
cd imports
python import-stage-1-via-api.py
```

## Wat het script doet

1. **Haalt Stage 1 ID op** via de API
2. **Leest het tekstbestand** `etappe 1 uitslag.txt`
3. **Parse alle resultaten** (namen, posities, tijden)
4. **Zoekt rider IDs op** via de API voor elke renner
5. **Importeert elk resultaat** via POST requests naar de API

## Voordelen van API import

- ✅ Geen directe database toegang nodig
- ✅ Werkt via HTTP (geen SQL client nodig)
- ✅ Automatische upsert (update als al bestaat)
- ✅ Progress feedback tijdens import
- ✅ Error handling per resultaat

## Troubleshooting

### Authentication Error
Als je een `401 Unauthorized` of `400 Bad Request` error krijgt met "missing authentication credentials" of "not a valid JWT encoding":
- **Probeer eerst:** Gebruik het SQL script (`import-stage-1-optimized.sql`) - dat werkt altijd!
- **Als je de API wilt gebruiken:**
  1. Controleer of je een PostgREST Service Role Key hebt in Neon Console → Settings → API
  2. Als die er niet is, probeer een Account API Key (Account Settings → API Keys)
  3. Als dat ook niet werkt, moet je mogelijk RLS (Row Level Security) uitschakelen in je database
  4. Of gebruik het SQL script - dat is de eenvoudigste optie!

### Rider Not Found
Als een renner niet gevonden wordt:
- Controleer of de naam correct gespeld is in `riders.csv`
- Het script gebruikt dezelfde naam parsing als de SQL versie

### Rate Limiting
Als je te veel requests doet:
- Het script wacht niet tussen requests
- Je kunt een `time.sleep(0.1)` toevoegen in de loop als nodig

## API Endpoints gebruikt

- `GET /stages?stage_number=eq.1&select=id` - Haal stage ID op
- `GET /riders?first_name=eq.{name}&last_name=eq.{name}&select=id` - Haal rider ID op
- `POST /stage_results` - Insert/update stage result (met upsert preference)

