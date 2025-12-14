# Database Configuratie

## Lokale Docker Database

De lokale Docker database gebruikt de volgende instellingen:

```
POSTGRES_PASSWORD=devpassword
POSTGRES_DB=tourpoule
PG_MAJOR=15
PG_VERSION=15.15-1.pgdg13+1
```

## Connection String

Voor lokale Docker database:
```
postgresql://postgres:devpassword@localhost:5432/tourpoule
```

## Environment Variable

In PowerShell:
```powershell
$env:DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/tourpoule"
```

Of voor Neon database:
```powershell
$env:NEON_DATABASE_URL="jouw-neon-connection-string"
```

## Gebruik

Om SQL scripts uit te voeren:
```powershell
# Stel eerst de database verbinding in
$env:DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/tourpoule"

# Voer het script uit
node imports/run-sql-script.js imports/add-6-test-teams.sql
```


