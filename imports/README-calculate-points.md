# Punten Berekenen voor Stages

## Automatisch (aanbevolen)
Punten worden automatisch berekend wanneer je een nieuwe etappe importeert via de UI.

## Handmatig voor bestaande stages

Als je stages hebt geïmporteerd vóór de automatische puntenberekening, moet je deze handmatig berekenen.

### Optie 1: Via Netlify Functions (aanbevolen)

Je kunt de `calculate-stage-points` functie aanroepen voor elke stage:

**Via curl (command line):**
```bash
# Vervang YOUR_SITE_URL met je Netlify site URL
# Vervang STAGE_ID met het stage ID (1, 2, 3, etc.)

curl -X POST https://YOUR_SITE_URL/.netlify/functions/calculate-stage-points \
  -H "Content-Type: application/json" \
  -d '{"stageId": 1}'
```

**Via browser console:**
```javascript
// Open browser console (F12) en voer uit:
fetch('/.netlify/functions/calculate-stage-points', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stageId: 1 })
})
.then(r => r.json())
.then(console.log);
```

### Optie 2: Via Node.js script (lokaal)

1. Zorg dat je `NEON_DATABASE_URL` hebt:
   ```powershell
   # Windows PowerShell
   $env:NEON_DATABASE_URL="your-connection-string"
   ```

2. Voer het script uit:
   ```bash
   node imports/calculate-points-simple.js
   ```

Dit script berekent automatisch punten voor alle stages die resultaten hebben maar nog geen punten.

## Controleren of punten zijn berekend

Voer dit SQL script uit:
```sql
-- imports/debug-points-calculation.sql
```

Of check in de database:
```sql
SELECT 
  s.stage_number,
  COUNT(DISTINCT sr.id) as result_count,
  COUNT(DISTINCT fsp.id) as points_entries
FROM stages s
LEFT JOIN stage_results sr ON s.id = sr.stage_id
LEFT JOIN fantasy_stage_points fsp ON s.id = fsp.stage_id
WHERE sr.id IS NOT NULL
GROUP BY s.stage_number
ORDER BY s.stage_number;
```

Stages die `points_entries = 0` hebben, hebben nog geen punten berekend.

