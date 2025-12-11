# Hoe weet je op welke poort Netlify Dev draait?

## Methode 1: Terminal Output (Eenvoudigst)

Wanneer je `npm run dev` start, zie je in de terminal output iets als:

```
◈ Netlify Dev ◈
◈ Server now ready on http://localhost:8888
```

**De poort staat in deze regel!** Meestal is dit `8888`, maar kan anders zijn als die poort bezet is.

## Methode 2: Browser Console

1. Open je applicatie in de browser (bijv. `http://localhost:8888`)
2. Druk op **F12** om Developer Tools te openen
3. Ga naar de **Console** tab
4. Type:
   ```javascript
   console.log(window.location.origin);
   ```
5. Dit toont: `http://localhost:8888` (of welke poort dan ook)

## Methode 3: Check Auth0 Redirect URL

1. Open je browser Developer Tools (F12)
2. Ga naar de **Network** tab
3. Probeer in te loggen
4. Kijk naar de failed request naar Auth0
5. In de URL zie je de `redirect_uri` parameter - daar staat de poort in!

## Methode 4: Via PowerShell

```powershell
netstat -ano | findstr :8888
```

Dit toont of poort 8888 in gebruik is. Als je Netlify Dev draait, zie je LISTENING op die poort.

## Belangrijk voor Auth0

**De redirect URL die je moet toevoegen aan Auth0 is:**
```
http://localhost:[POORT]/auth-callback.html
```

Vervang `[POORT]` met het nummer dat je ziet in de terminal output of browser console.

Bijvoorbeeld:
- Als poort 8888: `http://localhost:8888/auth-callback.html`
- Als poort 8889: `http://localhost:8889/auth-callback.html`

