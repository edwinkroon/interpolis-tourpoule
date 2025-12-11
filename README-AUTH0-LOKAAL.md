# Auth0 Configuratie voor Lokale Ontwikkeling

Als je niet kunt inloggen met Auth0 tijdens lokale ontwikkeling, moet je Auth0 configureren om localhost URLs te accepteren.

## Probleem

Auth0 blokkeert standaard redirects naar localhost URLs voor veiligheidsredenen. Je moet deze expliciet toevoegen in je Auth0 Dashboard.

## Oplossing: Auth0 Dashboard Configuratie

### Stap 1: Ga naar Auth0 Dashboard

1. Ga naar: https://manage.auth0.com/
2. Log in met je Auth0 account
3. Selecteer je **Application** (waarschijnlijk "Interpolis Tourpoule" of vergelijkbaar)

### Stap 2: Voeg Localhost URLs toe

1. Ga naar **Settings** tab
2. Scroll naar **Application URIs** sectie
3. In het veld **Allowed Callback URLs**, voeg toe:
   ```
   http://localhost:8888/auth-callback.html, http://127.0.0.1:8888/auth-callback.html
   ```
   
   ⚠️ **Let op:** Als Netlify Dev een andere poort gebruikt (bijv. 8889), voeg die ook toe:
   ```
   http://localhost:8888/auth-callback.html, http://localhost:8889/auth-callback.html, http://127.0.0.1:8888/auth-callback.html
   ```

4. In het veld **Allowed Logout URLs**, voeg toe:
   ```
   http://localhost:8888/logout.html, http://127.0.0.1:8888/logout.html
   ```

5. In het veld **Allowed Web Origins**, voeg toe:
   ```
   http://localhost:8888, http://127.0.0.1:8888
   ```

### Stap 3: Sla op

Klik op **Save Changes** onderaan de pagina.

### Stap 4: Test opnieuw

1. Stop je lokale server (Ctrl+C)
2. Start opnieuw: `npm run dev`
3. Probeer opnieuw in te loggen

## Huidige Configuratie

Je huidige Auth0 configuratie:
- **Domain:** `dev-g1uy3ps8fzt6ic37.us.auth0.com`
- **Client ID:** `4WLxdHDBodGyZB7Tbi3WRqECFqlbYeTO`

## Welke URLs Moeten Toegevoegd Worden?

De applicatie detecteert automatisch of je lokaal draait en gebruikt:
- **Production:** `https://interpolistourpoule.netlify.app/auth-callback.html`
- **Localhost:** `http://localhost:8888/auth-callback.html` (of de poort die Netlify Dev gebruikt)

## Troubleshooting

### "Invalid redirect_uri" error
- Controleer of je de exacte URL hebt toegevoegd (inclusief poortnummer)
- Controleer of er geen typfouten zijn
- Zorg dat je **Save Changes** hebt geklikt

### "Connection refused" error
- Zorg dat je lokale server draait (`npm run dev`)
- Controleer welke poort Netlify Dev gebruikt (staat in de terminal output)

### Login werkt maar redirect faalt
- Controleer of `auth-callback.html` bestaat en bereikbaar is
- Open browser console (F12) voor meer error details

### Poortnummer is anders dan 8888
- Netlify Dev kan automatisch een andere poort kiezen als 8888 bezet is
- Kijk in de terminal output welke poort wordt gebruikt
- Voeg die poort toe aan Auth0 Allowed Callback URLs

## Voorbeeld: Complete Allowed Callback URLs

Als je zowel productie als lokale ontwikkeling wilt ondersteunen:

```
https://interpolistourpoule.netlify.app/auth-callback.html, http://localhost:8888/auth-callback.html, http://localhost:8889/auth-callback.html, http://127.0.0.1:8888/auth-callback.html
```

Scheid meerdere URLs met een **komma en spatie**.

