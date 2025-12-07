(async () => {
  try {
    // Wacht even om er zeker van te zijn dat scripts geladen zijn
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Wacht tot auth0 beschikbaar is (max 5 seconden)
    let attempts = 0;
    while (typeof auth0 === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof auth0 === 'undefined') {
      console.error('Auth0 SDK niet geladen na wachten');
      document.body.innerHTML = '<p>Fout: Auth0 SDK niet geladen. Ververs de pagina.</p>';
      return;
    }

    console.log('Initialiseren Auth0 client...');
    const auth0Client = await auth0.createAuth0Client({
      domain: AUTH0_CONFIG.domain,
      clientId: AUTH0_CONFIG.clientId,
      authorizationParams: {
        redirect_uri: AUTH0_CONFIG.redirectUri
      }
    });
    console.log('Auth0 client geïnitialiseerd');

    // Verwerk het antwoord van Auth0
    console.log('Verwerken redirect callback...');
    await auth0Client.handleRedirectCallback();
    console.log('Redirect callback verwerkt');

    const user = await auth0Client.getUser();
    console.log('Gebruiker ingelogd:', user);

    if (!user || !user.sub) {
      console.error('Geen user of user.sub gevonden');
      window.location.href = 'index.html';
      return;
    }

    // Check of gebruiker al bestaat in database
    try {
      const response = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(user.sub)}`);
      const result = await response.json();
      
      console.log('User check result:', result);
      
      if (result.ok && result.exists) {
        // Gebruiker bestaat al, redirect naar home
        console.log('Gebruiker bestaat al, redirecten naar home.html...');
        window.location.href = 'home.html';
      } else {
        // Gebruiker bestaat nog niet, redirect naar index (welcome flow)
        console.log('Gebruiker bestaat nog niet, redirecten naar index.html...');
        window.location.href = 'index.html';
      }
    } catch (error) {
      console.error('Fout bij checken van gebruiker:', error);
      // Bij error, gewoon naar index redirecten
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Fout bij verwerken van callback:', error);
    document.body.innerHTML = `<p>Fout bij inloggen: ${error.message || error}. <a href="login.html">Probeer opnieuw</a></p>`;
  }
})();

