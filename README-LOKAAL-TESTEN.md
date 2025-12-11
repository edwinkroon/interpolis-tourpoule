# Lokaal Testen - Handleiding

Je kunt nu de applicatie lokaal testen zonder elke keer naar Git te pushen!

## Vereisten

1. **Node.js** (versie 14 of hoger)
2. **Netlify CLI** (wordt automatisch geïnstalleerd)
3. **Database credentials** (NEON_DATABASE_URL)

## Installatie

1. **Installeer dependencies:**
   ```powershell
   npm install
   ```
   
   Dit installeert automatisch:
   - Netlify CLI (voor lokale development)
   - PostgreSQL client (pg) voor database connecties

2. **Maak een `.env` bestand** in de root van het project:
   ```env
   NEON_DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require
   ```
   
   ⚠️ **Belangrijk:** Vervang dit met je echte database credentials. Je kunt deze vinden in:
   - Netlify Dashboard → Site settings → Environment variables → `NEON_DATABASE_URL`
   
   💡 **Tip:** Het `.env` bestand staat al in `.gitignore`, dus je credentials worden niet naar Git gepusht.

## Lokaal Starten

Start de lokale ontwikkelomgeving:

```powershell
npm run dev
```

of

```powershell
npm start
```

De applicatie draait nu op: **http://localhost:8888** (of een andere poort als 8888 bezet is)

### Welke poort wordt gebruikt?

**Methode 1: Terminal output (snelste)**
- Kijk in de terminal waar je `npm run dev` hebt gestart
- Je ziet: `◈ Server now ready on http://localhost:8888`
- Het poortnummer staat in deze regel!

**Methode 2: Browser**
- Open `check-port.html` in je browser (na het starten van `npm run dev`)
- Dit bestand toont automatisch de poort en alle Auth0 URLs die je nodig hebt

**Methode 3: Browser Console**
- Open je applicatie in de browser
- Druk op **F12** → **Console** tab
- Type: `window.location.origin`
- Dit toont: `http://localhost:8888` (of welke poort dan ook)

Netlify Dev start automatisch:
- ✅ Een lokale server voor je HTML/JS bestanden
- ✅ Een lokale proxy voor Netlify Functions
- ✅ Environment variables uit je `.env` bestand

## Wat Werkt Lokaal?

- ✅ Alle HTML pagina's
- ✅ Alle JavaScript functionaliteit
- ✅ Alle Netlify Functions (API calls)
- ✅ Database connecties
- ✅ Auth0 authenticatie (geconfigureerd voor localhost)

## Stoppen

Druk op `Ctrl+C` in de terminal om de server te stoppen.

## Troubleshooting

### "Database configuration missing" error
- Controleer of je `.env` bestand bestaat
- Controleer of `NEON_DATABASE_URL` correct is ingesteld
- Herstart de dev server na het aanpassen van `.env`

### Kan niet inloggen met Auth0
- ⚠️ **Belangrijk:** Je moet Auth0 configureren om localhost URLs te accepteren
- Zie [README-AUTH0-LOKAAL.md](README-AUTH0-LOKAAL.md) voor gedetailleerde instructies
- Voeg `http://localhost:8888/auth-callback.html` toe aan Auth0 Allowed Callback URLs

### Port 8888 is al in gebruik
- Netlify Dev probeert automatisch een andere poort
- Of stop andere applicaties die poort 8888 gebruiken
- **Let op:** Als de poort anders is, voeg die ook toe aan Auth0 configuratie!

### Functions werken niet
- Zorg dat je `package/package.json` naar de root hebt gekopieerd
- Run `npm install` opnieuw
- Controleer of `netlify/functions` directory bestaat

### "Task timed out after 30.00 seconds" error
- Sommige functions (zoals `validate-stage-results`) hebben meer tijd nodig lokaal
- **Oplossing 1 (Aanbevolen):** Gebruik productie voor validatie
  - Test de rest lokaal, maar gebruik https://interpolistourpoule.netlify.app/etappetoevoegen.html voor validatie
  - Dit werkt sneller en is betrouwbaarder
  
- **Oplossing 2:** Probeer langere timeout (werkt mogelijk niet)
  ```powershell
  npm run dev:slow
  ```
  Dit probeert een timeout van 60 seconden, maar werkt mogelijk niet met alle Netlify CLI versies

- **Oplossing 3:** Optimaliseer de functie
  - De functie doet veel database queries die geoptimaliseerd kunnen worden
  - Dit vereist code wijzigingen aan `netlify/functions/validate-stage-results.js`

**Let op:** Netlify Dev heeft standaard een timeout van 10 seconden, maar je ziet 30 seconden omdat er mogelijk al een configuratie is. Er is geen officiële manier om dit te verhogen voor lokale ontwikkeling.

## Voordelen van Lokaal Testen

- ⚡ **Sneller** - Geen wachttijd op Git push en Netlify deploy
- 🔄 **Iteratie** - Direct feedback bij code wijzigingen
- 🐛 **Debuggen** - Makkelijker fouten vinden en oplossen
- 💰 **Gratis** - Geen Netlify build minutes gebruikt

## Productie Deploy

Nadat je lokaal hebt getest en alles werkt:
1. Commit je wijzigingen
2. Push naar Git
3. Netlify deployt automatisch

---

**Tip:** Je kunt `npm run dev` in een apart terminal venster open laten staan terwijl je code aanpast. De server herlaadt automatisch bij wijzigingen!

