# Project Structuur Herorganisatie Voorstel

## Huidige Situatie

De huidige project structuur heeft veel bestanden in de root directory:
- 15+ HTML bestanden in root
- `scripts/` folder met JavaScript bestanden
- `styles/` folder met CSS bestanden
- `assets/` folder met afbeeldingen
- `netlify/functions/` voor serverless functions
- `imports/` folder met mix van SQL, Python, JS, CSV, MD bestanden
- `package/` folder voor build dependencies
- `database_csv/` folder voor development data

## Voorgestelde Nieuwe Structuur

```
/
├── src/                          # Source code (wat naar Netlify wordt gedeployed)
│   ├── html/                     # HTML bestanden
│   │   ├── index.html
│   │   ├── home.html
│   │   ├── etappeoverzicht.html
│   │   ├── etappetoevoegen.html
│   │   ├── teamoverzicht.html
│   │   ├── rules.html
│   │   ├── statistieken.html
│   │   ├── 404.html
│   │   ├── login.html
│   │   ├── logout.html
│   │   ├── auth-callback.html
│   │   ├── welcome2.html
│   │   └── welcome3.html
│   ├── scripts/                  # JavaScript bestanden
│   │   ├── auth0-spa-js.production.js
│   │   ├── auth-config.js
│   │   ├── auth.js
│   │   ├── utils.js
│   │   ├── build-info.js
│   │   ├── index.js
│   │   ├── home.js
│   │   ├── etappeoverzicht.js
│   │   ├── etappetoevoegen.js
│   │   ├── teamoverzicht.js
│   │   ├── auth-callback.js
│   │   ├── login.js
│   │   ├── welcome2.js
│   │   ├── welcome3.js
│   │   └── build-optimize.js
│   ├── styles/                   # CSS bestanden
│   │   ├── grid.css
│   │   └── style.css
│   └── assets/                   # Static assets
│       ├── headerillustration.svg
│       └── arrow.svg
├── netlify/                      # Netlify configuratie
│   ├── functions/                # Serverless functions
│   │   ├── _shared/              # Shared helpers
│   │   │   └── db.js
│   │   ├── validate-stage-results.js
│   │   ├── import-stage-results.js
│   │   ├── get-build-info.js
│   │   ├── get-stages-without-results.js
│   │   ├── get-latest-stage.js
│   │   ├── get-stages-with-results.js
│   │   ├── calculate-stage-points.js
│   │   ├── get-my-stage-riders.js
│   │   ├── get-user.js
│   │   ├── check-first-stage-has-results.js
│   │   ├── get-stages.js
│   │   ├── get-stage-results.js
│   │   ├── get-all-riders.js
│   │   ├── get-team-riders.js
│   │   ├── get-rider-photo.js
│   │   ├── save-participant.js
│   │   ├── add-team-riders.js
│   │   ├── delete-team-riders.js
│   │   ├── save-team-jerseys.js
│   │   ├── import-riders.js
│   │   └── import-teams-from-riders.js
│   └── _redirects
├── docs/                         # Documentatie
│   ├── OPTIMALISATIE_RAPPORT.md
│   ├── PROJECT_STRUCTUUR_VOORSTEL.md
│   ├── MEDIUM_PRIORITEIT_IMPLEMENTATIE.md
│   └── database.html
├── scripts/                      # Development/build scripts
│   ├── sql/                      # SQL scripts
│   │   ├── add-soren-waerenskjold.sql
│   │   ├── insert-scoring-rules.sql
│   │   ├── clear-stage-results.sql
│   │   ├── check-points-setup.sql
│   │   ├── debug-points-calculation.sql
│   │   ├── calculate-points-for-all-stages.sql
│   │   └── clear-all-stage-data.sql
│   ├── python/                   # Python import scripts
│   │   └── (Python bestanden)
│   ├── data/                     # CSV/data bestanden
│   │   ├── riders-from-pdf.csv
│   │   └── (andere CSV bestanden)
│   └── js/                       # Development JavaScript
│       ├── calculate-points-for-stages.js
│       ├── calculate-points-simple.js
│       └── calculate-all-stages.html
├── database_csv/                 # Development database data
├── package/                      # Build dependencies
│   ├── package.json
│   └── package-lock.json
├── netlify.toml                  # Netlify configuratie
├── package.json                  # Root package.json (metadata)
└── README.md                     # Project documentatie
```

## Voordelen

1. **Duidelijke Scheiding**: Source code (`src/`) is gescheiden van development tools (`scripts/`, `docs/`)
2. **Makkelijker Navigeren**: Logische groepering van bestanden
3. **Betere Organisatie**: Duidelijke structuur voor groei
4. **Netlify Deployment**: Alleen `src/` hoeft gedeployed te worden
5. **Development Tools**: SQL, Python, en data scripts zijn duidelijk gescheiden

## Nadelen

1. **Veel Bestanden Verplaatsen**: ~50+ bestanden moeten verplaatst worden
2. **Netlify Configuratie Aanpassen**: `netlify.toml` moet aangepast worden:
   ```toml
   [build]
     publish = "src"
     functions = "netlify/functions"
     command = "cp package/package.json . && cp package/package-lock.json . && npm install"
   ```
3. **HTML Paths Aanpassen**: Alle HTML bestanden moeten paths aanpassen:
   - `scripts/` → `../scripts/` (of relatieve paths aanpassen)
   - `styles/` → `../styles/`
   - `assets/` → `../assets/`
4. **JavaScript Paths**: Alle JavaScript bestanden moeten paths aanpassen:
   - Netlify functions: `/.netlify/functions/...` (blijft hetzelfde)
   - Relatieve paths moeten aangepast worden
5. **Git History**: Bestanden verplaatsen kan Git history complexer maken
6. **Testing**: Alle functionaliteit moet opnieuw getest worden

## Implementatie Stappen

Als dit voorstel wordt goedgekeurd, zou de implementatie als volgt verlopen:

1. **Backup**: Git commit van huidige staat
2. **Nieuwe Folders**: Aanmaken van nieuwe folder structuur
3. **Bestanden Verplaatsen**: Systematisch verplaatsen van bestanden
4. **Paths Aanpassen**: Alle paths in HTML, JS, en configuratie bestanden aanpassen
5. **Netlify Config**: `netlify.toml` aanpassen
6. **Testing**: Uitgebreid testen van alle functionaliteit
7. **Documentatie**: README en andere docs updaten

## Aanbeveling

**Voor nu**: Dit is een grote wijziging die veel werk vereist. Gezien dat:
- De huidige structuur functioneel is
- Er geen directe problemen zijn met de huidige organisatie
- De voordelen vooral organisatorisch zijn (niet functioneel)

**Aanbeveling**: Dit voorstel uitvoeren wanneer:
- Het project groeit en de huidige structuur onoverzichtelijk wordt
- Er nieuwe developers bij komen die baat hebben bij duidelijkere structuur
- Er tijd is voor uitgebreide testing na de herstructurering

**Alternatief**: Kleine verbeteringen kunnen nu al gedaan worden:
- `imports/` folder beter organiseren (subfolders voor SQL, Python, etc.)
- Ongebruikte bestanden verwijderen
- Documentatie beter organiseren

## Beslissing Vereist

Dit is een **grote wijziging** die impact heeft op:
- Alle HTML bestanden (path aanpassingen)
- Netlify configuratie
- Mogelijk Git history
- Testing van alle functionaliteit

**Moet ik dit voorstel uitvoeren, of wil je eerst kleinere verbeteringen doen?**

