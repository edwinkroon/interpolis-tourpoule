# Database Configuratie voor Python Script

## Waar vind je de database credentials?

### In Netlify Dashboard:

1. Ga naar je Netlify site: https://app.netlify.com
2. Selecteer je site (interpolistourpoule)
3. Ga naar **Site settings** → **Environment variables**
4. Zoek naar `NEON_DATABASE_URL`

Deze connection string ziet er ongeveer zo uit:
```
postgresql://username:password@host.neon.tech/dbname?sslmode=require
```

## Lokaal gebruiken:

### Optie 1: Environment Variable (Aanbevolen)

**In PowerShell:**
```powershell
$env:NEON_DATABASE_URL="postgresql://username:password@host.neon.tech/dbname?sslmode=require"
python imports/download-rider-photos.py
```

**In Command Prompt (cmd):**
```cmd
set NEON_DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require
python imports/download-rider-photos.py
```

### Optie 2: .env bestand (Veiliger)

Maak een `.env` bestand in de root van je project:
```
NEON_DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require
```

En installeer python-dotenv:
```bash
pip install python-dotenv
```

Dan kan je het script aanpassen om het .env bestand te laden.

### Optie 3: Direct in het script (Niet aanbevolen voor productie)

Je kunt de connection string tijdelijk hardcoden in het script, maar **verwijder dit voordat je naar Git pusht!**

## Veiligheid:

⚠️ **BELANGRIJK:** 
- Deel je database credentials NOOIT publiekelijk
- Voeg `.env` toe aan `.gitignore`
- Gebruik nooit productie credentials in test scripts

